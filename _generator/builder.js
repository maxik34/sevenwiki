const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

const CONFIG =
{
	siteName: "sevenwiki",
	templatePath: path.join(__dirname, 'template.html'), 
	contentFileName: "_article.txt",
	globalsFileName: "_globals.json",
	interfaceFileName: "_interface.json"
};

const baseTemplate = fs.readFileSync(CONFIG.templatePath, 'utf-8');

function buildStatic(dir)
{
	const files = fs.readdirSync(dir);
	
	files.forEach(file =>
	{
		const fullPath = path.join(dir, file);
		
		if ((file.startsWith('_') && file !== CONFIG.contentFileName) || file.startsWith('.'))
			return;
		
		if (fs.statSync(fullPath).isDirectory())
		{
			buildStatic(fullPath);
		}
		else if (file === CONFIG.contentFileName)
		{
			const relativePath = path.relative(ROOT_DIR, dir);
			const pathParts = relativePath.split(path.sep);
			const currentLang = pathParts.shift();
			const pageName = pathParts.join('/');
			
			const interfacePath = path.join(ROOT_DIR, currentLang, CONFIG.interfaceFileName);
			let translations = {};
			
			if (fs.existsSync(interfacePath))
				translations = JSON.parse(fs.readFileSync(interfacePath, 'utf-8'));
			
			const globalsPath = path.join(dir, CONFIG.globalsFileName);
			let pageGlobals = {};
			
			if (fs.existsSync(globalsPath))
				pageGlobals = JSON.parse(fs.readFileSync(globalsPath, 'utf-8'));
			
			const allVars = { ...translations, ...pageGlobals };
			let articleContent = fs.readFileSync(fullPath, 'utf-8');
			
			Object.keys(allVars).forEach(key =>
			{
				const regex = new RegExp(`{{${key}}}`, 'g');
				articleContent = articleContent.replace(regex, allVars[key]);
			});
			
			articleContent = articleContent.replace(/{{FULLPAGENAME}}/g, pageName);
			
			let finalHtml = baseTemplate.replace(/{{ARTICLE}}/g, articleContent)
										.replace(/{{SITE}}/g, CONFIG.siteName)
										.replace(/{{LANG}}/g, currentLang)
										.replace(/{{FULLPAGENAME}}/g, pageName);
			
			Object.keys(allVars).forEach(key =>
			{
				const regex = new RegExp(`{{${key}}}`, 'g');
				finalHtml = finalHtml.replace(regex, allVars[key]);
			});
			
			const outputPath = path.join(dir, 'index.html');
			
			fs.writeFileSync(outputPath, finalHtml);
			console.log(`[${currentLang}] Built: ${pageName}`);
		}
	});
}

console.log("Starting Build System...");
buildStatic(ROOT_DIR);
console.log("Build finished");