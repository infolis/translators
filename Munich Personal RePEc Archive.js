{
    "translatorID": "836be685-f557-4c97-8159-695ca567321a",
    "label": "Munich Personal RePEc Archive",
    "creator": "Konstantin Baierer",
    "target": "http:\\/\\/mpra\\.ub\\.uni-muenchen\\.de/44201/?",
    "minVersion": "1.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 5,
    "browserSupport": "gv",
    "lastUpdated": "2015-02-12 11:41:43"
}

var xmlns = {'mets': 'http://www.loc.gov/METS/', 'mods': 'http://www.loc.gov/mods/v3'};


function detectWeb (doc, url) {
  if (/mpra\.ub\.uni-muenchen\.de\/\d+\/?$/.test(url)) {
    return "report";
  } else if (url.indexOf('/search') > -1) {
    return "multiple";
  }
}

function doWeb(doc, url) {

  if (detectWeb(doc, url) === "report") {
    var articleId = url.replace(/https?:\/\/mpra\.ub\.uni-muenchen\.de\//, "").replace(/\/.*/, "");
    //Zotero.debug("Article ID: " + articleId);
    return scrape(doc, articleId);
  }
}

function scrape(doc, id) {
  
  var modsurl = "http://mpra.ub.uni-muenchen.de/cgi/oai2?verb=GetRecord&metadataPrefix=mets&identifier=oai:mpra.ub.uni-muenchen.de:" + id;
  
  //Zotero.debug(modsurl);
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
      // Attach PDF
          var pdflink = ZU.xpathText(oaiDoc, "//mets:file[@MIMETYPE='application/pdf']/@OWNERID", xmlns);
          //Zotero.debug(pdflink);
          item.attachments = [
              {title: "MPRA - " + id + " - Snapshot", mimeType: "text/html", document: doc},
              {url: pdflink, title: "MPRA - " + id + " - Fulltext", mimeType: "application/pdf"}
          ];
        item.complete();
      }); 
      return translator.translate();
  });
}
