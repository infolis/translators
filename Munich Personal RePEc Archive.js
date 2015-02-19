{
	"translatorID": "836be685-f557-4c97-8159-695ca567321a",
	"label": "Munich Personal RePEc Archive",
	"creator": "",
	"target": "http:\\/\\/mpra\\.ub\\.uni-muenchen\\.de/.*",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 5,
	"browserSupport": "g",
	"lastUpdated": "2015-02-13 09:33:34"
}

function doWeb(doc, url) {
  var epTranslator = new EprintsWebTranslator();
  epTranslator.doWeb(doc, url);
}

function epTranslator(doc, url) {
  var epTranslator = new EprintsWebTranslator();
  epTranslator.epTranslator(doc, url);
}

function EprintsWebTranslator (opts) {

  var LOG = Zotero.debug;

  opts = opts || {};

  var self = this;

  var xmlns = {'mets': 'http://www.loc.gov/METS/', 'mods': 'http://www.loc.gov/mods/v3'};

  var REPO_NAME       = opts.REPO_NAME       || 'MPRA';
  var REPO_HOST       = opts.REPO_HOST       || 'mpra.ub.uni-muenchen.de';
  var REPO_OAI_PREFIX = opts.REPO_OAI_PREFIX || 'oai:mpra.ub.uni-muenchen.de:';

  var re_single  = new RegExp('^https?://' + REPO_HOST.replace(/\./g, '\\.') + '/(?:id/eprint/)?(\\d+)/?');
  var re_search  = new RegExp('^https?://' + REPO_HOST.replace(/\./g, '\\.') + '/cgi/search/(?:archive/)?(?:simple|advanced)/?\?.*$');
  var re_browse  = new RegExp('^https?://' + REPO_HOST.replace(/\./g, '\\.') + '/view.*\\.html');
  var re_baseuri = new RegExp('^https?://' + REPO_HOST.replace(/\./g, '\\.'));

  this.debug = function() {
    return re_single;
    LOG(3);
    10/0;
    var LOG = Zotero.debug;
    LOG(REPO_NAME);
    LOG(REPO_HOST);
    LOG(REPO_OAI_PREFIX);
  };

  this.detectWeb = function(doc, url) {
	if (re_single.test(url))      return "report";
	else if (re_search.test(url)) return "multiple";
	else if (re_browse.test(url)) return "multiple";
  };

  this.doWeb = function(doc, url) {

	// Landing Pages
	if (self.detectWeb(doc, url) === "report") {
	  var articleId = url.replace(re_baseuri, "").replace(/\//, '').replace(/\/.*/, "");
	  return self.scrape(doc, articleId);

	// Browse
	} else if (self.detectWeb(doc, url) === 'multiple' && re_browse.test(url)) {
	  var exportForm = doc.querySelector("form");
	  var exportUrl = exportForm.getAttribute("action");
	  exportUrl += '?format=DC';
	  exportUrl += '&view=' + exportForm.querySelector("input#view").getAttribute("value");
	  exportUrl += '&values=' + exportForm.querySelector("input#values").getAttribute("value");
	  return self.scrapeListDublinCore(exportUrl);

	// Search results
	} else if (self.detectWeb(doc, url) === 'multiple' && re_search.test(url)) {
	  var exportUrl = url.replace(/\?.*/, '') + doc.querySelector("link[title='Dublin Core']").getAttribute("href");
	  return self.scrapeListDublinCore(exportUrl);
	}

  };

  this.scrapeListDublinCore = function(exportUrl) {
	return Zotero.Utilities.HTTP.doGet(exportUrl, function(body) {
	  Zotero.selectItems(self.parseDublinCore(body), function(selectedItems) {
		for (articleId in selectedItems) {
		  self.scrape(null, articleId);
		}
	  });
	});
  };

  this.parseDublinCore = function(body) {
	  possibleItems = {};
	  body.split(/\n\n+/).forEach(function(record) {
		var id, title, creator, year;
		record.split(/\n/).forEach(function(line) {
		  var key = line.substr(0, line.indexOf(':')).trim();
		  var val = line.substr(line.indexOf(':')+1).trim();
		  // LOG(key + '===' + val);
		  if (key === 'relation' && re_single.test(val)) id = re_single.exec(val)[1];
		  else if (key === 'title') title = val;
		  else if (key === 'creator') creator = val.split(/,/, 1);
		  else if (key === 'date') year = /\d+/.exec(val);
		});
		if (id) possibleItems[id] = creator + ' (' + year + '): ' + title;
	  });
	  return possibleItems;
  };

  this.scrapeListJSON = function(doc, url, callback) {
	var exportUrl = url.replace(/\?.*/, '') + doc.querySelector("link[title='JSON']").getAttribute("href");
	//LOG(exportUrl);
	Zotero.Utilities.HTTP.doGet(exportUrl, function (body) {
	  var results = JSON.parse(body);
	  var possibleItems = {};
	  for (i in results) {
		possibleItems[results[i].eprintid] = results[i].title;
	  }
	  Zotero.selectItems(possibleItems, function(selectedItems) {
		callback(selectedItems);
	  });
	});
  };

  this.scrape = function(doc, id) {

	var modsurl = "http://" + REPO_HOST + "/cgi/oai2?verb=GetRecord&metadataPrefix=mets&identifier=" + REPO_OAI_PREFIX + id;

	// LOG(modsurl);
	Zotero.Utilities.HTTP.doGet(modsurl, function (text) {

	  // parse XML with DOMParser
	  var parser = new DOMParser();
	  var oaiDoc = parser.parseFromString(text, "text/xml");
	  var metsmods = ZU.xpath(oaiDoc, '//mets:xmlData', xmlns);
	  var asXML = metsmods[0].outerHTML

	  // Strip mets
	  asXML = asXML.replace(/ xmlns:mods=.[^"]+./g, "");
	  asXML = asXML.replace(/ xmlns:mets=.[^"]+./, " xmlns:mods=\"" + xmlns.mods + "\"");
	  asXML = asXML.replace(/mets:xmlData/g, "mods:mods");

	  // Let MODS.js handle the bibliographic metadata
	  var translator = Zotero.loadTranslator("import");
	  translator.setTranslator("0e2235e7-babf-413c-9acf-f27cce5f059c"); // MODS.js
	  translator.setString(asXML);

	  translator.setHandler("itemDone", function(obj, item) {

		// Attach HTML
		var snapshotDoc = { title: REPO_NAME + " - " + id + " - Snapshot", mimeType: "text/html" };
		if (doc) snapshotDoc['document'] = doc;
		else snapshotDoc['url'] = 'https://' + REPO_HOST + '/' + id;
		item.attachments.push(snapshotDoc);

		// Attach PDF
		var pdflink = ZU.xpathText(oaiDoc, "//mets:file[@MIMETYPE='application/pdf']/@OWNERID", xmlns);
		var pdfDoc = { title: REPO_NAME + " - " + id + " - Fulltext", mimeType: "application/pdf", "url": pdflink};
		item.attachments.push(pdfDoc);

		item.complete();
	  }); 
	  return translator.translate();
	});
  };

  return this;
}

var exports = {
    "EprintsWebTranslator": EprintsWebTranslator,
    "detectWeb": detectWeb,
    "doWeb": doWeb
};
// vim: set sw=2:
