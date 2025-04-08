import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import fg from 'fast-glob'
import { fileURLToPath } from 'url'

const args = process.argv.slice(2)
function getArgValue(flag, defaultValue) {
	const index = args.indexOf(flag)
	return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const INPUT_DIR = path.resolve(__dirname, getArgValue('--input', 'articles'))
const OUTPUT_BASE = path.resolve(__dirname, getArgValue('--output', 'output'))
const TASK_FILE = path.resolve(__dirname, 'tasks.json')

function transformFrontmatter(data) {
	data.categories.length--
	return {
		title: data.title || '',
		publishDate: data.date ? data.date.split('T')[0] : '',
		description: '',
		tags: [...new Set([data.tags, data.categories].flat())] || [],
		legacy: true,
	}
}

function getOutputDir(slug, filePath) {
	const dirName = (slug != 'index' && slug) || path.basename(path.dirname(filePath)) // 取得 .md 所在資料夾名稱
	let safeName = slugify(dirName)

	// 🚫 如果 slugify 後仍為空或是 "output"，則 fallback 用隨機值
	if (!safeName || safeName.toLowerCase() === 'output') {
		const uniqueId = Math.random().toString(36).substring(2, 8)
		safeName = `untitled-${uniqueId}`
	}

	return path.join(OUTPUT_BASE, safeName)
}

function slugify(text) {
	return text
		.toString()
		.normalize('NFKD')
		.replace(/[^\w\- ]+/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.toLowerCase()
}

// 讀取任務檔案並執行
async function runTasksFromFile() {
	const taskJson = await fs.readFile(TASK_FILE, 'utf8')
	const tasks = JSON.parse(taskJson)

	for (const task of tasks) {
		await processMarkdownAndAssets(task)
	}

	console.log('\n✅ 所有任務已完成')
}

// 執行 Markdown 處理與複製資源
async function processMarkdownAndAssets(task) {
	const content = await fs.readFile(task.filePath, 'utf8')
	const parsed = matter(content)
	const frontmatter = transformFrontmatter(parsed.data)
	const newContent = matter.stringify(parsed.content, frontmatter, { lineWidth: -1 })

	await fs.mkdir(task.outDir, { recursive: true })
	const outPath = path.join(task.outDir, task.fileName)
	await fs.writeFile(outPath, newContent, 'utf8')
	console.log(`✅ 轉換：${task.filePath} → ${outPath}`)

	const entries = await fs.readdir(task.srcDir, { withFileTypes: true })
	for (const entry of entries) {
		const srcPath = path.join(task.srcDir, entry.name)
		const destPath = path.join(task.outDir, entry.name)
		if (entry.isFile() && entry.name !== task.fileName && !entry.name.endsWith('.md')) {
			await fs.copyFile(srcPath, destPath)
			console.log(`📎 複製：${srcPath} → ${destPath}`)
		}
	}
}

// 產生 tasks.json
async function generateTaskFile() {
	const mdFiles = await fg(`${INPUT_DIR}/**/*.md`)
	const filteredFiles = mdFiles.filter(filePath => path.basename(filePath) !== '_index.md')

	const tasks = await Promise.all(
		filteredFiles.map(async filePath => {
			const content = await fs.readFile(filePath, 'utf8')
			const parsed = matter(content)
			const outDir = getOutputDir(parsed.data.slug, filePath)

			return {
				filePath,
				fileName: path.basename(filePath),
				srcDir: path.dirname(filePath),
				outDir,
			}
		}),
	)

	await fs.writeFile(TASK_FILE, JSON.stringify(tasks, null, 2), 'utf8')
	console.log(`📦 任務已產生，共 ${tasks.length} 筆，請確認 ${TASK_FILE} 後再執行：\n\n👉 node script.js --run\n`)
}

// 主程式
const isRun = args.includes('--run')
if (isRun) {
	await runTasksFromFile()
} else {
	await generateTaskFile()
}
