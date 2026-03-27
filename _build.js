const fs = require('fs');
const path = require('path');



const CONFIG = {
	siteName: "sevenwiki",
	templatePath: "_base.html",
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
		
		if (file.startsWith('_') && file !== CONFIG.contentFileName) return;
		if (file.startsWith('.')) return;
		
		if (fs.statSync(fullPath).isDirectory())
		{
			buildStatic(fullPath);
		}
		else if (file === CONFIG.contentFileName)
		{
			const pathParts = fullPath.split(path.sep).filter(p => p !== '.' && p !== '');
			const currentLang = pathParts[0];
			const pageName = path.basename(dir);
			
			const interfacePath = path.join(currentLang, CONFIG.interfaceFileName);
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
			
			articleContent = articleContent.replace(/{{PAGENAME}}/g, pageName);
			
			let finalHtml = baseTemplate.replace(/{{ARTICLE}}/g, articleContent)
										.replace(/{{SITE}}/g, CONFIG.siteName)
										.replace(/{{LANG}}/g, currentLang)
										.replace(/{{PAGENAME}}/g, pageName);
			
			
			Object.keys(allVars).forEach(key =>
			{
				const regex = new RegExp(`{{${key}}}`, 'g');
				finalHtml = finalHtml.replace(regex, allVars[key]);
			});

			const outputPath = path.join(dir, 'index.html');
			fs.writeFileSync(outputPath, finalHtml);
			
			console.log(`[${currentLang}] Build success: ${outputPath}`);
		}
	});
}



console.log("Starting Build System...");
buildStatic('.');
console.log("Build finished");