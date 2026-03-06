import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink, UnderlineType } from "docx";

export const createNewsDocx = async ({ date, abstract, news, links }) => {
    // 1. 文档标题
    const titleParagraph = new Paragraph({
        text: `《新闻联播》 (${date})`,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
            after: 200,
        },
    });

    // 2. 新闻摘要部分
    const abstractHeader = new Paragraph({
        text: "新闻摘要",
        heading: HeadingLevel.HEADING_1,
        spacing: {
            before: 200,
            after: 100,
        },
    });

    const abstractParagraphs = abstract.split('\n\n').map(text => {
        if (!text.trim()) return null;
        return new Paragraph({
            children: [
                new TextRun({
                    text: text.trim(),
                    size: 24, // 12pt
                }),
            ],
            indent: {
                firstLine: 480, // 约等于2个汉字
            },
            spacing: {
                line: 360, // 1.5倍行距
                after: 200,
            },
        });
    }).filter(p => p !== null);


    // 3. 详细新闻部分
    const detailsHeader = new Paragraph({
        text: "详细新闻",
        heading: HeadingLevel.HEADING_1,
        spacing: {
            before: 200,
            after: 100,
        },
    });

    const newsSections = [];
    const newsLength = news.length;

    for (let i = 0; i < newsLength; i++) {
        const { title, content } = news[i];
        const link = links[i];

        // 新闻标题
        const newsTitle = new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_2,
            spacing: {
                before: 200,
                after: 100,
            },
        });

        // 新闻内容
        // 这里简单处理，如果有换行符也可以分割
        const contentParagraphs = content.split('\n').map(text => {
             // 清理一些可能的 HTML 标签或者多余空格，这里假设 content 已经是纯文本或简单格式
             // 实际上 content 可能是 HTML string, index.js 里是用 innerHTML 获取的
             
             // 替换 HTML 的换行标签为真正的换行
             let processedText = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n');
             
             // 暂时先用正则简单去除 HTML 标签
             const cleanText = processedText.replace(/<[^>]+>/g, '').trim();
             if (!cleanText) return null;

             // 按换行符分割成多段
             const paragraphs = cleanText.split('\n').map(segment => {
                 const segmentText = segment.trim();
                 if (!segmentText) return null;
                 
                 // 处理段落缩进 (2个中文字符宽度，约等于 24 * 2 = 48，或者用 indentation)
                 return new Paragraph({
                    children: [
                        new TextRun({
                            text: segmentText,
                            size: 24, // 12pt
                        }),
                    ],
                    indent: {
                        firstLine: 480, // 约等于2个汉字
                    },
                    spacing: {
                        line: 360, // 1.5倍行距
                        after: 200, // 段后间距
                    },
                 });
             }).filter(p => p !== null);
             
             return paragraphs;
        }).filter(p => p !== null).flat();

        // 原文链接
        const linkParagraph = new Paragraph({
            children: [
                new TextRun({
                    text: "查看原文: ",
                    size: 20,
                }),
                new ExternalHyperlink({
                    children: [
                        new TextRun({
                            text: link,
                            style: "Hyperlink",
                            color: "0000FF",
                            underline: {
                                type: UnderlineType.SINGLE,
                                color: "0000FF",
                            },
                        }),
                    ],
                    link: link,
                }),
            ],
            spacing: {
                before: 50,
                after: 400, // 增加到 400 (约20pt)，拉大新闻之间的间距
            },
        });

        newsSections.push(newsTitle, ...contentParagraphs, linkParagraph);
    }
    
    // 4. 更新时间戳
    const timestampParagraph = new Paragraph({
        children: [
            new TextRun({
                text: `(更新时间戳: ${new Date().getTime()})`,
                italics: true,
                size: 20,
                color: "888888",
            }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: {
            before: 400,
        },
    });


    // 组装文档
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                titleParagraph,
                abstractHeader,
                ...abstractParagraphs,
                detailsHeader,
                ...newsSections,
                new Paragraph({ text: "" }), // Spacer
                new Paragraph({ text: "---" }), // Divider
                timestampParagraph,
            ],
        }],
    });

    return await Packer.toBuffer(doc);
};
