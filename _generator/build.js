const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const SETTINGS = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8'));
const layoutBase = fs.readFileSync(path.join(__dirname, 'layout_base.html'), 'utf8');

let ENG_MASTER_MAP = {};

function generateMasterMap(currentPath, relativePath = '')
{
	const items = fs.readdirSync(currentPath);
	items.forEach(item =>
	{
		const itemPath = path.join(currentPath, item);
		
		if (fs.statSync(itemPath).isDirectory())
		{
			const nextRelPath = relativePath ? `${relativePath}/${item.toLowerCase()}` : item.toLowerCase();
			const configPath = path.join(itemPath, 'config.json');
			const contentPath = path.join(itemPath, 'content.txt');

			if (fs.existsSync(configPath) && fs.existsSync(contentPath))
			{
				ENG_MASTER_MAP[nextRelPath] =
				{
					config: JSON.parse(fs.readFileSync(configPath, 'utf8')),
					content: fs.readFileSync(contentPath, 'utf8')
				};
			}
			generateMasterMap(itemPath, nextRelPath);
		}
	});
}

function getValueByPath(obj, path)
{
	return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function renderPage(lang, pagePath, localeData, isFallback = false)
{
	const langDir = path.join(rootDir, lang);
	const pageDir = path.join(langDir, pagePath);

	if (!fs.existsSync(pageDir))
		fs.mkdirSync(pageDir, { recursive: true });

	let pageConfig, pageContent;

	if (isFallback)
	{
		pageConfig = ENG_MASTER_MAP[pagePath].config;
		pageContent = ENG_MASTER_MAP[pagePath].content;
	}
	else
	{
		pageConfig = JSON.parse(fs.readFileSync(path.join(pageDir, 'config.json'), 'utf8'));
		pageContent = fs.readFileSync(path.join(pageDir, 'content.txt'), 'utf8');
	}

	const data = { ...SETTINGS, ...localeData, ...pageConfig, "FULLPAGENAME": pagePath, "UI": localeData.UI };
	let html = layoutBase;

	html = html.replace('{{_PAGECONTENT}}', pageContent);
	html = html.replace('{{_ROBOTS}}', data.noindex === "1" ? '<meta name="robots" content="noindex, nofollow">' : '');
	html = html.replace('{{_DESCRIPTION}}', (data.PAGE && data.PAGE.DESCRIPTION) ? `<meta name="description" content="${data.PAGE.DESCRIPTION}">` : '');

	html = html.replace('{{_NOTRANSLATION}}', isFallback ? `<div class="PageNotice">{{UI.NOTRANSLATION}}</div>` : '');
	html = html.replace('{{_CANONICAL}}', isFallback ? `${SETTINGS.DEFAULTLANG}/${pagePath}/` : `${lang}/${pagePath}/`);

	const replaceTemplates = (text) =>
	{
		return text.replace(/\{\{([\w.]+)\}\}/g, (match, keyPath) =>
		{
			const val = getValueByPath(data, keyPath);
			return val !== undefined ? val : match;
		});
	};

	html = replaceTemplates(replaceTemplates(html));

	fs.writeFileSync(path.join(pageDir, 'index.html'), html);
}

function renderTechPages()
{
	const defaultLang = SETTINGS.DEFAULTLANG;
	const localeRaw = JSON.parse(fs.readFileSync(path.join(rootDir, defaultLang, 'locale.json'), 'utf8'));

	const data =
	{
		...SETTINGS,
		...localeRaw
	};

	const replaceTemplates = (text) =>
	{
		return text.replace(/\{\{([\w.]+)\}\}/g, (match, keyPath) =>
		{
			const val = getValueByPath(data, keyPath);
			return val !== undefined ? val : match;
		});
	};

	let html404 = fs.readFileSync(path.join(__dirname, 'layout_404.html'), 'utf8');
	html404 = replaceTemplates(replaceTemplates(html404));
	fs.writeFileSync(path.join(rootDir, '404.html'), html404);
	console.log('\n[OK] Generated 404.html in the root');

	let htmlRoot = fs.readFileSync(path.join(__dirname, 'layout_root.html'), 'utf8');
	htmlRoot = replaceTemplates(replaceTemplates(htmlRoot));
	fs.writeFileSync(path.join(rootDir, 'index.html'), htmlRoot);
	console.log('[OK] Generated index.html in the root');
}

const defaultLocalePath = path.join(rootDir, SETTINGS.DEFAULTLANG, 'locale.json');
const DEFAULT_LOCALE_DATA = JSON.parse(fs.readFileSync(defaultLocalePath, 'utf8'));

function build()
{
	generateMasterMap(path.join(rootDir, SETTINGS.DEFAULTLANG));

	const languages = fs.readdirSync(rootDir).filter(f => fs.existsSync(path.join(rootDir, f, 'locale.json')));

	languages.forEach(lang =>
	{
		const currentLocalePath = path.join(rootDir, lang, 'locale.json');
		const currentLocaleData = JSON.parse(fs.readFileSync(currentLocalePath, 'utf8'));

		const mergedLocaleData =
		{
			...DEFAULT_LOCALE_DATA,
			...currentLocaleData,
			UI: {
				...DEFAULT_LOCALE_DATA.UI,
				...currentLocaleData.UI
			}
		};

		console.log(`\n[LANG] Building language: ${lang}`);

		Object.keys(ENG_MASTER_MAP).forEach(pagePath =>
		{
			const localConfigPath = path.join(rootDir, lang, pagePath, 'config.json');
			const hasTranslation = fs.existsSync(localConfigPath);

			renderPage(lang, pagePath, mergedLocaleData, !hasTranslation);
			console.log(`  ${hasTranslation ? '[OK]' : '[FALLBACK]'} ${pagePath}`);
		});
	});
	
	renderTechPages();
	
	console.log("\n[DONE] Building complete");
}


build();