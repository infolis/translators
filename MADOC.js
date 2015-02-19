{
	"translatorID": "66f9b887-fcd9-4fc1-a26f-73e959b68b0a",
	"label": "MADOC",
	"creator": "Konstantin Baierer",
	"target": "https://ub-madoc.bib.uni-mannheim.de/.*",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 5,
	"browserSupport": "g",
	"lastUpdated": "2015-02-19 09:02:26"
}

LOG = Zotero.debug;

var epOpts = {
	'REPO_NAME': 'MADOC',
	'REPO_HOST': 'ub-madoc.bib.uni-mannheim.de',
	'REPO_OAI_PREFIX': 'oai:ub-madoc.bib.uni-mannheim.de:'
}


function detectWeb(doc, url) {
	var xxx = Zotero.loadTranslator("web");
	xxx.setTranslator("836be685-f557-4c97-8159-695ca567321a");
	return xxx.getTranslatorObject(function(mod) {
		var inst = new mod.EprintsWebTranslator(epOpts);
		LOG(inst.debug().test(url));
		return inst.detectWeb(doc, url);
	});
}
