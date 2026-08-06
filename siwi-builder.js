const Path = require('path');
const FileSystem = require('fs').promises;
const RootPath = Path.resolve(__dirname);

const SiteVarFile = 'site.json';
const LangVarFile = 'lang.json';
const PageVarFile = 'page.json';

const VarName =
{
	Root: 'root',
	DefaultLang: 'defaultlang',
	Direction: 'dir',
	SiteName: 'sitename',
	MainPage: 'mainpage',
	LangName: 'langname'
}

const DefaultValue =
{
	Root: '',
	DefaultLang: 'en',
	Direction: 'ltr',
	MainPage: 'main-page'
}

let BaseVars = {};
const LangList = [];




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
			ConsoleMessage('Autofix: "' + FullOrigName + '" --> "' + Path.join(CurrentDir, NormalizedName) + '"');
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
	const FinalPath = Path.join(DirectoryPath, FileName);
	
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




async function ParseAllLangs()
{
	const FilesList = await ReadDirectory(RootPath, { withFileTypes: true });
	
	for (const Entry of FilesList)
	{
		if (!Entry.isDirectory() || Entry.name === '.git' || Entry.name === '.github')
			continue;
		
		try
		{
			const PotentialLangPath = Path.join(RootPath, Entry.name, LangVarFile);
			await FileSystem.stat(PotentialLangPath);
		}
		catch (Error)
		{
			if (Error.code === 'ENOENT')
				continue;
			
			ConsoleError('Error checking folder "' + Entry.name + '": ' + Error.message);
			process.exit(1);
		}
		
		const ParsedLangVars = await ParseJsonFile(Path.join(RootPath, Entry.name), LangVarFile);
		
		LangList.push(Entry.name);
		
		if (ParsedLangVars.hasOwnProperty(VarName.LangName))
		{
			BaseVars = { ...BaseVars, [VarName.LangName + '-' + Entry.name]: ParsedLangVars[VarName.LangName] };
			ConsoleMessage('Added "' + Entry.name + '" - "' + ParsedLangVars[VarName.LangName] + '"');
		}
		else
		{
			ConsoleWarning('Added "' + Entry.name + '", but it\'s missing "' + VarName.LangName + '" variable.');
		}
	}
}




async function Init()
{
	ConsoleHeader('===================================\n');
	ConsoleHeader('        Simple Wiki Builder\n');
	ConsoleHeader('===================================\n');
	
	ConsoleHeader('Checking the site for invalid names...');
	await NormalizeWebsite(RootPath, true);
	ConsoleSuccess('All file and folder names are valid!\n');
	
	BaseVars =
	{
		[VarName.Root]: DefaultValue.Root,
		[VarName.DefaultLang]: DefaultValue.DefaultLang,
		[VarName.Direction]: DefaultValue.Direction,
		[VarName.MainPage]: DefaultValue.MainPage,
		...(await ParseJsonFile(RootPath, SiteVarFile))
	};
	
	ConsoleHeader('Building "' + BaseVars[VarName.SiteName] + '" website...');
	ConsoleMessage('"' + VarName.Root + '" set to "' + BaseVars[VarName.Root] + '"');
	ConsoleMessage('"' + VarName.DefaultLang + '" set to "' + BaseVars[VarName.DefaultLang] + '"');
	ConsoleMessage('"' + VarName.MainPage + '" set to "' + BaseVars[VarName.MainPage] + '"');
	ConsoleSuccess('Base variables have been set!\n');
	
	ConsoleHeader('Collecting a list of languages...');
	await ParseAllLangs();
	ConsoleSuccess('Total languages found: ' + LangList.length + '\n');
	
	// TODO: продолжать тут
	
	ConsoleHeader('===================================\n');
}




Init();