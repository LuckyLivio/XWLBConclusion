import fetch from './fetch.js';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import fs from 'fs';
import path, { resolve } from 'path';
import { createNewsDocx } from './docx-generator.js';

import { fileURLToPath } from "url";
// const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 得到当前日期
 * @returns 当前日期, 格式如: 20220929
 */
const getDate = () => {
	const add0 = num => num < 10 ? ('0' + num) : num;
	const date = new Date();
	return '' + date.getFullYear() + add0(date.getMonth() + 1) + add0(date.getDate());
}
// 当前日期
const DATE = getDate();
// /news 目录
const NEWS_PATH = path.join(__dirname, 'news');
// /news/xxxxxxxx.md 文件
const NEWS_MD_PATH = path.join(NEWS_PATH, DATE + '.md');
// /README.md 文件
const README_PATH = path.join(__dirname, 'README.md');
// /news/catalogue.json 文件
const CATALOGUE_JSON_PATH = path.join(NEWS_PATH, 'catalogue.json');

/**
 * 读取文件
 * @param {String} path 需读取文件的路径
 * @returns {String} (Primise) 文件内容
 */
const readFile = path => {
	return new Promise((resolve, reject) => {
		fs.readFile(path, {}, (err, data) => {
			if (err) reject(err);
			resolve(data);
		});
	});
};

/**
 * 写入文件 (覆写)
 * @param {String} path 需写入文件的路径
 * @param {String} data 需写入的数据
 * @returns {*} (Primise)
 */
const writeFile = (path, data) => {
	return new Promise((resolve, reject) => {
		fs.writeFile(path, data, err => {
			if (err) reject(err);
			resolve(true);
		});
	});
};

/**
 * 获取新闻列表
 * @param {String|Number} date 当前日期
 * @returns {Object} abstract为简介的链接, news为新闻链接数组
 */
const getNewsList = async date => {
	const HTML = await fetch(`http://tv.cctv.com/lm/xwlb/day/${date}.shtml`);
	const fullHTML = `<!DOCTYPE html><html><head></head><body>${HTML}</body></html>`;
	const dom = new JSDOM(fullHTML);
	const nodes = dom.window.document.querySelectorAll('a');
	var links = [];
	nodes.forEach(node => {
		// 从dom节点获得href中的链接
		let link = node.href;
		// 如果已经有了就不再添加 (去重)
		if (!links.includes(link)) links.push(link);
	});
	const abstract = links.shift();
	console.log('成功获取新闻列表');
	return {
		abstract,
		news: links
	}
}

/**
 * 获取新闻摘要 (简介)
 * @param {String} link 简介的链接
 * @returns {String} 简介内容
 */
const getAbstract = async link => {
	const HTML = await fetch(link);
	const dom = new JSDOM(HTML);
	const abstract = dom.window.document.querySelector(
		'#page_body > div.allcontent > div.video18847 > div.playingCon > div.nrjianjie_shadow > div > ul > li:nth-child(1) > p'
	).innerHTML.replaceAll('；', "；\n\n").replaceAll('：', "：\n\n");
	console.log('成功获取新闻简介');
	return abstract;
}

/**
 * 获取新闻本体
 * @param {Array} links 链接数组
 * @returns {Object} title为新闻标题, content为新闻内容
 */
const getNews = async links => {
	const linksLength = links.length;
	console.log('共', linksLength, '则新闻, 开始获取');
	// 所有新闻
	var news = [];
	for (let i = 0; i < linksLength; i++) {
		const url = links[i];
		const html = await fetch(url);
		const dom = new JSDOM(html);
		const title = dom.window.document.querySelector('#page_body > div.allcontent > div.video18847 > div.playingVideo > div.tit')?.textContent?.replace('[视频]', '').trim();
		const contentArea = dom.window.document.querySelector('#content_area');
		let content = '';
		if (contentArea) {
			// 将 <p> 标签替换为换行，并移除其他 HTML 标签
			content = contentArea.innerHTML
				.replace(/<p[^>]*>/gi, '')
				.replace(/<\/p>/gi, '\n\n')
				.replace(/<br\s*\/?>/gi, '\n')
				.replace(/<[^>]+>/g, '')
				.trim();
		}
		news.push({ title, content });
		console.count('获取的新闻则数');
	}
	console.log('成功获取所有新闻');
	return news;
}

/**
 * 将数据处理为md格式
 * @param {Object} object date为获取的时间, abstract为新闻简介, news为新闻数组, links为新闻链接
 * @returns {String} 处理成功后的md文本
 */
const newsToMarkdown = ({ date, abstract, news, links }) => {
	// 将数据处理为md文档
	let mdNews = '';
	const newsLength = news.length;
	for (let i = 0; i < newsLength; i++) {
		const { title, content } = news[i];
		const link = links[i];
		mdNews += `### ${title}\n\n${content}\n\n[查看原文](${link})\n\n`;
	}
	return `# 《新闻联播》 (${date})\n\n## 新闻摘要\n\n${abstract}\n\n## 详细新闻\n\n${mdNews}\n\n---\n\n(更新时间戳: ${new Date().getTime()})\n\n`;
}

const saveTextToFile = async (savePath, text) => {
	// 输出到文件
	await writeFile(savePath, text);
}

const updateCatalogue = async ({ catalogueJsonPath, readmeMdPath, date, abstract }) => {
	const NEWS_DIR = path.dirname(catalogueJsonPath);
	
	// 1. 更新 catalogue.json
	let catalogueJson = [];
	if (fs.existsSync(catalogueJsonPath)) {
		try {
			const data = fs.readFileSync(catalogueJsonPath, 'utf-8');
			catalogueJson = JSON.parse(data || '[]');
		} catch (e) {
			console.error('读取 catalogue.json 失败:', e.message);
		}
	}

	// 检查当前日期是否已存在，不存在则添加
	if (date && abstract && !catalogueJson.some(item => item.date === date)) {
		catalogueJson.unshift({ date, abstract });
		// 也可以顺便清理一下不在 news 目录里的条目
		const existingFiles = fs.readdirSync(NEWS_DIR);
		catalogueJson = catalogueJson.filter(item => existingFiles.includes(`${item.date}.md`));
		
		await writeFile(catalogueJsonPath, JSON.stringify(catalogueJson, null, 2));
		console.log('更新 catalogue.json 完成');
	}
	
	// 2. 根据 news 文件夹下的实际文件全量更新 README.md
	if (fs.existsSync(readmeMdPath)) {
		let readmeContent = fs.readFileSync(readmeMdPath, 'utf-8');
		
		// 获取 news 目录下所有的 .md 文件 (排除 catalogue.json)
		const files = fs.readdirSync(NEWS_DIR)
			.filter(file => /^\d{8}\.md$/.test(file))
			.map(file => file.replace('.md', ''))
			.sort((a, b) => b - a); // 降序排列

		const historyList = files.map(d => {
			const hasDocx = fs.existsSync(path.join(NEWS_DIR, `${d}.docx`));
			const docxLink = hasDocx ? ` ([Word](./news/${d}.docx))` : '';
			return `- [${d}](./news/${d}.md)${docxLink}`;
		}).join('\n');

		// 替换 <!-- INSERT --> 之后的内容
		const marker = '<!-- INSERT -->';
		const markerIndex = readmeContent.indexOf(marker);
		
		if (markerIndex !== -1) {
			const newReadmeContent = readmeContent.substring(0, markerIndex + marker.length) + '\n' + historyList + '\n';
			await writeFile(readmeMdPath, newReadmeContent);
			console.log('根据 news 目录同步更新 README.md 完成');
		} else {
			// 如果没找到标记，尝试在 ## History 后面追加
			const historyHeader = '## History';
			const historyIndex = readmeContent.indexOf(historyHeader);
			if (historyIndex !== -1) {
				const newReadmeContent = readmeContent.substring(0, historyIndex + historyHeader.length) + '\n\n' + marker + '\n' + historyList + '\n';
				await writeFile(readmeMdPath, newReadmeContent);
				console.log('未找到标记，已重新初始化 README.md 历史区域');
			}
		}
	}
}

export const fetchNews = async (dateStr) => {
	const DATE = dateStr || getDate();
	// /news 目录
	const NEWS_PATH = path.join(__dirname, 'news');
	if (!fs.existsSync(NEWS_PATH)) {
		fs.mkdirSync(NEWS_PATH, { recursive: true });
	}
	// /news/xxxxxxxx.md 文件
	const NEWS_MD_PATH = path.join(NEWS_PATH, DATE + '.md');
    // /news/xxxxxxxx.docx 文件
    const NEWS_DOCX_PATH = path.join(NEWS_PATH, DATE + '.docx');
	// /README.md 文件
	const README_PATH = path.join(__dirname, 'README.md');
	// /news/catalogue.json 文件
	const CATALOGUE_JSON_PATH = path.join(NEWS_PATH, 'catalogue.json');

	console.log('DATE:', DATE);
	console.log('NEWS_PATH:', NEWS_PATH);
	console.log('README_PATH:', README_PATH);
	console.log('CATALOGUE_JSON_PATH:', CATALOGUE_JSON_PATH);

	try {
		const newsListResult = await getNewsList(DATE);
		// Check if newsList is valid
		if (!newsListResult || !newsListResult.news || newsListResult.news.length === 0) {
			console.log('未找到该日期的新闻');
			return null;
		}

		const abstractContent = await getAbstract(newsListResult.abstract);
		const newsContent = await getNews(newsListResult.news);
		
		const md = newsToMarkdown({
			date: DATE,
			abstract: abstractContent,
			news: newsContent,
			links: newsListResult.news
		});

		await saveTextToFile(NEWS_MD_PATH, md);
        
        // 生成并保存 Word 文档
        const docxBuffer = await createNewsDocx({
            date: DATE,
            abstract: abstractContent,
            news: newsContent,
            links: newsListResult.news
        });
        await writeFile(NEWS_DOCX_PATH, docxBuffer);

		await updateCatalogue({ 
			catalogueJsonPath: CATALOGUE_JSON_PATH,
			readmeMdPath: README_PATH,
			date: DATE,
			abstract: abstractContent
		});
		console.log('全部成功, 程序结束');
		return { date: DATE, content: md, abstract: abstractContent };
	} catch (error) {
		console.error('获取新闻失败:', error);
		throw error;
	}
};

// Check if running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const dateArg = process.argv[2];
    
    if (dateArg) {
        // 如果指定了日期，只抓取那一天
        await fetchNews(dateArg);
    } else {
        // 如果没指定日期，抓取最近 7 天
        console.log('未指定日期，开始检查最近 7 天的新闻...');
        
        // 简单函数: 获取 dateStr
        const getDateStr = (d) => {
             const add0 = num => num < 10 ? ('0' + num) : num;
             return '' + d.getFullYear() + add0(d.getMonth() + 1) + add0(d.getDate());
        };

        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = getDateStr(date);
            
            console.log(`\n------------------\n检查日期: ${dateStr}`);
            
            // 路径定义
            const NEWS_PATH = path.join(__dirname, 'news');
            const NEWS_MD_PATH = path.join(NEWS_PATH, dateStr + '.md');
            const NEWS_DOCX_PATH = path.join(NEWS_PATH, dateStr + '.docx');

            // 检查 md 和 docx 是否都存在
            if (fs.existsSync(NEWS_MD_PATH) && fs.existsSync(NEWS_DOCX_PATH)) {
                console.log(`日期 ${dateStr} 的数据已完整存在，跳过抓取。`);
                continue;
            }

            try {
                await fetchNews(dateStr);
            } catch (e) {
                console.log(`日期 ${dateStr} 获取失败或暂无新闻 (可能是未来日期或未发布):`, e.message);
            }
        }

        // 最后统一同步一次 README.md，确保所有 news 目录下的文件都列出来了
        console.log('\n正在全量同步 README.md...');
        await updateCatalogue({
            catalogueJsonPath: path.join(__dirname, 'news', 'catalogue.json'),
            readmeMdPath: path.join(__dirname, 'README.md')
        });
    }
}
