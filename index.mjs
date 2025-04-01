import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import fg from 'fast-glob'
import { fileURLToPath } from 'url'

// ✅ CLI 參數解析
const args = process.argv.slice(2)
function getArgValue(flag, defaultValue) {
	const index = args.indexOf(flag)
	return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue
}

// 📂 CLI 指定輸入輸出資料夾
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const INPUT_DIR = path.resolve(__dirname, getArgValue('--input', 'articles'))
const OUTPUT_BASE = path.resolve(__dirname, getArgValue('--output', 'output'))

// 🔁 frontmatter 轉換邏輯
function transformFrontmatter(data) {
	return {
		title: data.title || '',
		publishDate: data.date ? data.date.split('T')[0] : '',
		description: '請在這裡輸入摘要內容',
		tags: data.tags || [],
	}
}

// 📁 建立輸出資料夾名稱邏輯：使用 slug 或 fallback 為上層資料夾名
function getOutputDir(slug, filePath) {
	const fallback = path.basename(path.dirname(filePath)) // 使用上層資料夾名
	const rawName = slug || fallback || ''
	let safeName = slugify(rawName)

	// 🚫 確保不會是空字串或 output 本身
	if (!safeName || safeName.toLowerCase() === 'output') {
		const uniqueId = Math.random().toString(36).substring(2, 8) // 例如 "a1b2c3"
		safeName = `untitled-${uniqueId}`
	}

	return path.join(OUTPUT_BASE, safeName)
}

// 轉換成安全資料夾名稱
function slugify(text) {
	return text
		.toString()
		.normalize('NFKD') // 避免中文字或重音符號
		.replace(/[^\w\- ]+/g, '') // 移除特殊符號
		.trim()
		.replace(/\s+/g, '-') // 空格轉破折號
		.toLowerCase()
}

// 📄 處理 Markdown
async function processMarkdown(filePath) {
	const content = await fs.readFile(filePath, 'utf8')
	const parsed = matter(content)

	const frontmatter = transformFrontmatter(parsed.data)
	const newContent = matter.stringify(parsed.content, frontmatter, { lineWidth: -1 })

	const outDir = getOutputDir(parsed.data.slug, filePath)
	await fs.mkdir(outDir, { recursive: true })

	const fileName = path.basename(filePath)
	const outPath = path.join(outDir, fileName)

	await fs.writeFile(outPath, newContent, 'utf8')
	console.log(`✅ 轉換：${filePath} → ${outPath}`)

	return { outDir, srcDir: path.dirname(filePath), excludeFile: fileName }
}

// 📁 複製非 .md 檔案
async function copySiblingAssets(srcDir, outDir, excludeFile) {
	const entries = await fs.readdir(srcDir, { withFileTypes: true })

	await Promise.all(
		entries.map(async entry => {
			const srcPath = path.join(srcDir, entry.name)
			const destPath = path.join(outDir, entry.name)

			if (entry.isFile() && entry.name !== excludeFile && !entry.name.endsWith('.md')) {
				await fs.copyFile(srcPath, destPath)
				console.log(`📎 複製：${srcPath} → ${destPath}`)
			}
		}),
	)
}

// 🚀 主程式（已支援跳過 _index.md）
const main = async () => {
	const mdFiles = await fg(`${INPUT_DIR}/**/*.md`)

	// 🛑 過濾掉 _index.md
	const filteredFiles = mdFiles.filter(filePath => path.basename(filePath) !== '_index.md')

	const tasks = await Promise.all(filteredFiles.map(processMarkdown))

	await Promise.all(tasks.map(({ srcDir, outDir, excludeFile }) => copySiblingAssets(srcDir, outDir, excludeFile)))

	console.log('\n🎉 所有檔案處理完成！（_index.md 已跳過）')
}

main()
