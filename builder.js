const Path = require('path');
const FileSystem = require('fs').promises;
const RootPath = Path.resolve(__dirname);

const SiteConfigFile = 'site.json';
const LangConfigFile = 'lang.json';
const PageConfigFile = 'page.json';

const Var =
{
	Root: 'root',
	DefaultLang: 'defaultlang',
	Direction: 'dir',
	SiteName: 'sitename',
	MainPage: 'mainpage',
	Lang: 'lang',
	LangName: 'langname'
}

const Default =
{
	Lang: 'en',
	Direction: 'ltr',
	MainPage: 'main-page'
}

let BaseVars = {};




function ConsoleMessage(ConsoleString = '')	{ console.log(ConsoleString); }
function ConsoleHeader(ConsoleString = '')	{ console.log('\x1b[36m' + ConsoleString + '\x1b[0m'); }
function ConsoleSuccess(ConsoleString = '')	{ console.log('\x1b[32m' + ConsoleString + '\x1b[0m'); }
function ConsoleWarning(ConsoleString = '')	{ console.log('\x1b[33m' + ConsoleString + '\x1b[0m'); }
function ConsoleError(ConsoleString = '')	{ console.error('\x1b[31m' + ConsoleString + '\x1b[0m'); }

async function ReadDirectory(DirectoryPath, Options = {})
{
	try
	{
		return await FileSystem.readdir(DirectoryPath, Options);
	}
	catch (Error)
	{
		if (Error.code === 'ENOENT')
			ConsoleError('Error: directory "' + DirectoryPath + '" is missing.');
		else
			ConsoleError('Error: ' + Error.message);
		
		process.exit(1);
	}
}




const Replaces =
{
	'$': 's', '@': 'a', '~': '-',
	'¡': 'i', '¢': 'c', '£': 'f', '¥': 'y', '©': 'c', 'ª': 'a', '®': 'r', '²': '2', '³': '3', '¹': '1', '×': 'x',
	'α': 'a', 'β': 'b', 'ε': 'e', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'χ': 'x',
	'а': 'a', 'в': 'b', 'е': 'e', 'з': '3', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x',
	'ѕ': 's', 'і': 'i', 'ј': 'j'
};
	
const ReplacesRegex = new RegExp('[' + Object.keys(Replaces).join('') + ']', 'g');
const InvalidChars = /[^a-z0-9\-\.\_\+]/;

function NormalizeName(Name, FullPath)
{
	Name = Name.toLowerCase();
	Name = Name.replace(/[\s,]+/g, '-').replace(/&/g, 'and');
	Name = Name.replace(ReplacesRegex, c => Replaces[c]);
	
	if (InvalidChars.test(Name))
	{
		ConsoleError('Error: Forbidden character found in "' + FullPath + '".');
		process.exit(1);
	}
	
	return Name;
}




async function NormalizeWebsite(CurrentDir, First = false)
{
	let IsNormalized = false;
	const Entries = await ReadDirectory(CurrentDir, { withFileTypes: true });

	for (const Entry of Entries)
	{
		if (First && (Entry.name === '.git' || Entry.name === '.github' || Entry.name === 'LICENSE'))
			continue;

		const FullOrigName = Path.join(CurrentDir, Entry.name);
		const NormalizedName = NormalizeName(Entry.name, FullOrigName);

		if (Entry.name !== NormalizedName)
		{
			await FileSystem.rename(FullOrigName, Path.join(CurrentDir, NormalizedName));
			Entry.name = NormalizedName;
			ConsoleWarning('Normalizer: "' + FullOrigName + '" --> "' + Path.join(CurrentDir, NormalizedName) + '".');
			IsNormalized = true;
		}
	}

	for (const Entry of Entries)
	{
		if (!Entry.isDirectory() || (First && (Entry.name === '.git' || Entry.name === '.github')))
			continue;

		const WasNormalized = await NormalizeWebsite(Path.join(CurrentDir, Entry.name));
		IsNormalized = IsNormalized || WasNormalized;
	}

	return IsNormalized;
}




async function ParseJsonFile(DirectoryPath, FileName)
{
	const FinalPath = Path.join(DirectoryPath, FileName.toLowerCase());
	
	try
	{
		const RawData = await FileSystem.readFile(FinalPath, 'utf-8');
		const ParsedData = JSON.parse(RawData);
		
		return ParsedData;
	}
	catch (Error)
	{
		if (Error.code === 'ENOENT')
			ConsoleError('Error: File "' + FinalPath + '" not found.');
		else
			ConsoleError('Error parsing "' + FinalPath + '": ' + Error.message);
		
		process.exit(1);
	}
}




async function Init()
{
	ConsoleHeader('===================================\n');
	ConsoleHeader('        Simple Wiki Builder\n');
	ConsoleHeader('===================================\n');
	
	if (await NormalizeWebsite(RootPath, true))
		ConsoleMessage();
	
	const ParsedSiteConfig = await ParseJsonFile(RootPath, SiteConfigFile);
	BaseVars = { [Var.Root]: '', [Var.DefaultLang]: Default.Lang, [Var.Direction]: Default.Direction, [Var.MainPage]: Default.MainPage, ...ParsedSiteConfig };
	const ParsedLangConfig = await ParseJsonFile(Path.join(RootPath, BaseVars[Var.DefaultLang]), LangConfigFile);
	BaseVars = { ...BaseVars, ...ParsedLangConfig }
	ConsoleSuccess('Building "' + BaseVars[Var.SiteName] + '" website.')
	ConsoleMessage('"' + Var.Root + '" set to "' + BaseVars[Var.Root] + '".');
	ConsoleMessage('"' + Var.DefaultLang + '" set to "' + BaseVars[Var.DefaultLang] + '".');
	ConsoleMessage('"' + Var.MainPage + '" set to "' + BaseVars[Var.MainPage] + '".\n');
	
	// TODO: finish it!
	
	ConsoleHeader('===================================\n');
}




Init();