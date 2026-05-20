var LAGUNA_API_URL_PROPERTY = "LAGUNA_API_URL";
var LAGUNA_API_TOKEN_PROPERTY = "LAGUNA_API_TOKEN";
var LAGUNA_SOURCE_CATEGORY_PROPERTY = "LAGUNA_SOURCE_CATEGORY";
var LAGUNA_SOURCE_NAME_PROPERTY = "LAGUNA_SOURCE_NAME";
var LAGUNA_BI_API_INGEST_URL = "https://bi-lagunaportas.vercel.app/api/ingest";
var LAGUNA_DEFAULT_SOURCE_CATEGORY = "Usinagem";
var LAGUNA_DEFAULT_SOURCE_NAME = "Usinagem";
var LAGUNA_DEFAULT_SHEET_PATTERN = "USI PER";
var LAGUNA_PENDING_SOURCES_SHEET = "LagunaBI_Origens_Pendentes";
var LAGUNA_PENDING_SOURCES_HEADERS = [
  "Ativo",
  "URL ou ID da planilha",
  "Nome da origem",
  "Categoria",
  "Status",
  "Ultima extracao",
  "Cortes",
  "Clientes",
  "Processos",
  "Mensagem"
];

function doGet(e) {
  var route = getApiRoute_(e);

  if (route === "health") {
    return jsonResponse_({
      ok: true,
      app: "BI Laguna",
      generatedAt: new Date().toISOString()
    });
  }

  if (route === "data" || route === "json" || route === "api") {
    return jsonResponse_(getLagunaBiPayload_());
  }

  return renderLagunaBiDashboard_();
}

function doPost(e) {
  var body = parsePostBody_(e);
  var action = String(body.action || getApiRoute_(e) || "data").toLowerCase();

  if (action === "sync" || action === "send") {
    return jsonResponse_(sendLagunaBiDataToExternalApi());
  }

  return jsonResponse_(getLagunaBiPayload_());
}

function getLagunaBiPayload_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var properties = PropertiesService.getScriptProperties();
  var sourceCategory = properties.getProperty(LAGUNA_SOURCE_CATEGORY_PROPERTY) || getLagunaDefaultCategory_();
  var sourceName = properties.getProperty(LAGUNA_SOURCE_NAME_PROPERTY) || getLagunaDefaultSourceName_(spreadsheet);
  return getLagunaBiPayloadFromSpreadsheet_(spreadsheet, sourceName, sourceCategory);
}

function getLagunaBiPayloadFromSpreadsheet_(spreadsheet, sourceName, sourceCategory) {
  sourceCategory = sourceCategory || getLagunaDefaultCategory_();
  var reportData = getReportDataFromSpreadsheet_(spreadsheet, { category: sourceCategory });
  if (!reportData) {
    return {
      ok: false,
      app: "BI Laguna",
      generatedAt: new Date().toISOString(),
      diagnostic: getExtractionDiagnosticMessage(),
      data: null
    };
  }

  sourceName = sourceName || getLagunaDefaultSourceName_(spreadsheet);
  var payload = {
    ok: true,
    app: "BI Laguna",
    version: "1.0.0",
    category: sourceCategory,
    generatedAt: new Date().toISOString(),
    timezone: Session.getScriptTimeZone(),
    source: {
      id: spreadsheet.getId(),
      name: sourceName,
      category: sourceCategory,
      type: "google_sheets",
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl()
    },
    spreadsheet: {
      id: spreadsheet.getId(),
      name: spreadsheet.getName(),
      url: spreadsheet.getUrl()
    },
    endpoints: getLagunaWebAppCoordinates_(),
    data: reportData,
    charts: buildLagunaChartData_(reportData)
  };

  return payload;
}

function buildLagunaChartData_(reportData) {
  var indicators = reportData.indicators || {};
  return {
    kpis: [
      { label: "Clientes", value: Number(indicators.totalClients || 0) },
      { label: "Processos", value: Number(indicators.totalProcesses || 0) },
      { label: "Cortes", value: Number(indicators.totalCuts || 0) },
      { label: "Comprimento Total (m)", value: Number(indicators.totalLengthMeters || 0) },
      { label: "Barras", value: Number(indicators.totalBars || 0) },
      { label: "Tempo Total (h)", value: Number(indicators.totalTimeHours || 0) }
    ],
    cutDistribution: Object.keys(reportData.cutTypeCounts || {}).map(function(type) {
      return { label: type, value: Number(reportData.cutTypeCounts[type] || 0) };
    }),
    clientTime: (reportData.clientSummary || []).map(function(item) {
      return {
        label: item.client,
        value: Number(item.totalTimeHours || 0),
        cuts: Number(item.totalCuts || 0),
        bars: Number(item.totalBars || 0)
      };
    }),
    processTime: (reportData.clientProcessSummary || []).map(function(item) {
      return {
        label: item.client + " | " + item.process,
        client: item.client,
        process: item.process,
        value: Number(item.timeHours || 0),
        cuts: Number(item.totalCuts || 0),
        bars: Number(item.totalBars || 0)
      };
    }),
    profileBars: (reportData.profileBarUsage || []).map(function(item) {
      return {
        label: item.profile,
        value: Number(item.totalBars || 0),
        length: Number(item.totalLengthMeters || 0)
      };
    }),
    dailyCuts: (reportData.dailySummary || []).map(function(item) {
      return {
        label: item.date,
        value: Number(item.totalCuts || 0),
        timeHours: Number(item.timeHours || 0)
      };
    }),
    operatorTime: (reportData.operatorSummary || []).map(function(item) {
      return {
        label: item.operator,
        value: Number(item.timeHours || 0),
        cuts: Number(item.totalCuts || 0)
      };
    })
  };
}

function getLagunaBiDataForClient() {
  return getLagunaBiPayload_();
}

function renderLagunaBiDashboard_() {
  var template = HtmlService.createTemplateFromFile("LagunaBI");
  template.payload = JSON.stringify(getLagunaBiPayload_());
  return template.evaluate()
    .setTitle("BI Laguna")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function showLagunaBiDashboard() {
  var html = renderLagunaBiDashboard_();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1180).setHeight(720), "BI Laguna");
}

function showLagunaWebAppCoordinates() {
  var coordinates = getLagunaWebAppCoordinates_();
  var message = [
    "URL do Web App: " + coordinates.dashboardUrl,
    "Dados JSON: " + coordinates.dataUrl,
    "Health check: " + coordinates.healthUrl,
    "",
    "Para publicar: Apps Script > Implantar > Nova implantacao > App da Web.",
    "Executar como: voce. Acesso: conforme a necessidade do time."
  ].join("\n");

  SpreadsheetApp.getUi().alert("Coordenadas do Web App", message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function getLagunaWebAppCoordinates_() {
  var webAppUrl = ScriptApp.getService().getUrl() || "PUBLIQUE_COMO_APP_DA_WEB";
  return {
    dashboardUrl: webAppUrl,
    dataUrl: webAppUrl + "?route=data",
    healthUrl: webAppUrl + "?route=health",
    postUrl: webAppUrl
  };
}

function getLagunaDefaultApiUrl_() {
  return LAGUNA_BI_API_INGEST_URL;
}

function getLagunaDefaultCategory_() {
  return LAGUNA_DEFAULT_SOURCE_CATEGORY;
}

function getLagunaDefaultSourceName_(spreadsheet) {
  return LAGUNA_DEFAULT_SOURCE_NAME || spreadsheet.getName();
}

function configureLagunaExternalApi(apiUrl, apiToken) {
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty(LAGUNA_API_URL_PROPERTY, apiUrl || getLagunaDefaultApiUrl_());
  properties.setProperty(LAGUNA_API_TOKEN_PROPERTY, apiToken || "");
}

function configureLagunaSourceFromMenu() {
  var ui = SpreadsheetApp.getUi();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var properties = PropertiesService.getScriptProperties();
  var currentCategory = properties.getProperty(LAGUNA_SOURCE_CATEGORY_PROPERTY) || getLagunaDefaultCategory_();
  var currentName = properties.getProperty(LAGUNA_SOURCE_NAME_PROPERTY) || getLagunaDefaultSourceName_(spreadsheet);

  var categoryResponse = ui.prompt(
    "Configurar Categoria",
    "Informe a categoria desta planilha no BI Laguna. Para esta planilha, use Usinagem.\nAtual: " + currentCategory,
    ui.ButtonSet.OK_CANCEL
  );
  if (categoryResponse.getSelectedButton() !== ui.Button.OK) return;

  var sourceNameResponse = ui.prompt(
    "Configurar Origem",
    "Informe o nome amigavel desta origem no BI Laguna.\nAtual: " + currentName,
    ui.ButtonSet.OK_CANCEL
  );
  if (sourceNameResponse.getSelectedButton() !== ui.Button.OK) return;

  properties.setProperty(LAGUNA_SOURCE_CATEGORY_PROPERTY, categoryResponse.getResponseText().trim() || currentCategory);
  properties.setProperty(LAGUNA_SOURCE_NAME_PROPERTY, sourceNameResponse.getResponseText().trim() || currentName);
  ui.alert("Origem configurada", "Categoria e origem desta planilha foram salvas para os proximos envios.", ui.ButtonSet.OK);
}

function setupLagunaPendingSourcesSheetFromMenu() {
  var sheet = getLagunaPendingSourcesSheet_();
  SpreadsheetApp.getUi().alert(
    "Lista preparada",
    "A aba \"" + LAGUNA_PENDING_SOURCES_SHEET + "\" esta pronta. Preencha uma linha por planilha usando URL ou ID.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  SpreadsheetApp.setActiveSheet(sheet);
}

function addActiveSpreadsheetToLagunaPendingSourcesFromMenu() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var properties = PropertiesService.getScriptProperties();
  var sheet = getLagunaPendingSourcesSheet_();
  var sourceName = properties.getProperty(LAGUNA_SOURCE_NAME_PROPERTY) || getLagunaDefaultSourceName_(spreadsheet);
  var sourceCategory = properties.getProperty(LAGUNA_SOURCE_CATEGORY_PROPERTY) || getLagunaDefaultCategory_();
  var values = sheet.getDataRange().getDisplayValues();
  var foundRow = -1;

  for (var i = 1; i < values.length; i++) {
    if (extractSpreadsheetId_(values[i][1]) === spreadsheet.getId()) {
      foundRow = i + 1;
      break;
    }
  }

  var rowValues = [
    "SIM",
    spreadsheet.getUrl(),
    sourceName,
    sourceCategory,
    "Pendente",
    "",
    "",
    "",
    "",
    ""
  ];

  if (foundRow === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
  }

  SpreadsheetApp.getUi().alert(
    "Origem adicionada",
    "A planilha atual foi cadastrada para extracao em lote.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function extractLagunaPendingSourcesFromMenu() {
  var result = extractLagunaPendingSources_();
  SpreadsheetApp.getUi().alert(
    result.ok ? "Extracao concluida" : "Extracao incompleta",
    result.message,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function getLagunaPendingSourcesSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(LAGUNA_PENDING_SOURCES_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(LAGUNA_PENDING_SOURCES_SHEET);
  }

  var firstRow = sheet.getRange(1, 1, 1, LAGUNA_PENDING_SOURCES_HEADERS.length).getDisplayValues()[0];
  var needsHeader = firstRow.join("").trim() === "";
  if (needsHeader) {
    sheet.getRange(1, 1, 1, LAGUNA_PENDING_SOURCES_HEADERS.length).setValues([LAGUNA_PENDING_SOURCES_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, LAGUNA_PENDING_SOURCES_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#e9f5ee");
    sheet.autoResizeColumns(1, LAGUNA_PENDING_SOURCES_HEADERS.length);
  }

  return sheet;
}

function getLagunaPendingSources_() {
  var sheet = getLagunaPendingSourcesSheet_();
  var values = sheet.getDataRange().getDisplayValues();
  var sources = [];

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    var row = values[rowIndex];
    var urlOrId = String(row[1] || "").trim();
    if (!urlOrId) continue;

    var activeValue = normalizeLagunaText_(row[0] || "sim");
    var isActive = activeValue === "" || ["sim", "s", "yes", "y", "true", "1", "ativo"].indexOf(activeValue) !== -1;
    if (!isActive) continue;

    sources.push({
      rowIndex: rowIndex + 1,
      spreadsheetId: extractSpreadsheetId_(urlOrId),
      sourceName: String(row[2] || "").trim(),
      category: String(row[3] || getLagunaDefaultCategory_()).trim() || getLagunaDefaultCategory_()
    });
  }

  return {
    sheet: sheet,
    sources: sources
  };
}

function extractLagunaPendingSources_() {
  var pending = getLagunaPendingSources_();
  var sheet = pending.sheet;
  var payloads = [];
  var results = [];
  var now = new Date();

  if (!pending.sources.length) {
    return {
      ok: false,
      payloads: [],
      results: [],
      message: "Nenhuma origem ativa encontrada na aba " + LAGUNA_PENDING_SOURCES_SHEET + "."
    };
  }

  pending.sources.forEach(function(source) {
    try {
      var spreadsheet = SpreadsheetApp.openById(source.spreadsheetId);
      var payload = getLagunaBiPayloadFromSpreadsheet_(
        spreadsheet,
        source.sourceName || spreadsheet.getName(),
        source.category || getLagunaDefaultCategory_()
      );
      var data = payload.data || {};
      var indicators = data.indicators || {};
      var status = payload.ok ? "OK" : "SEM DADOS";
      var message = payload.ok ? "Extraido com sucesso" : (payload.diagnostic || "Nenhum dado valido encontrado");

      sheet.getRange(source.rowIndex, 5, 1, 6).setValues([[
        status,
        now,
        indicators.totalCuts || 0,
        indicators.totalClients || 0,
        indicators.totalProcesses || 0,
        message
      ]]);

      if (payload.ok) payloads.push(payload);
      results.push({
        ok: payload.ok,
        sourceName: source.sourceName || spreadsheet.getName(),
        category: source.category,
        message: message
      });
    } catch (error) {
      sheet.getRange(source.rowIndex, 5, 1, 6).setValues([[
        "ERRO",
        now,
        "",
        "",
        "",
        error.message
      ]]);
      results.push({
        ok: false,
        sourceName: source.sourceName || source.spreadsheetId,
        category: source.category,
        message: error.message
      });
    }
  });

  SpreadsheetApp.flush();

  return {
    ok: payloads.length > 0,
    payloads: payloads,
    results: results,
    message: [
      "Origens ativas: " + pending.sources.length,
      "Payloads validos: " + payloads.length,
      "Falhas/sem dados: " + (pending.sources.length - payloads.length)
    ].join("\n")
  };
}

function extractSpreadsheetId_(value) {
  var text = String(value || "").trim();
  var match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : text;
}

function normalizeLagunaText_(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectLagunaDefaultCategory_(spreadsheet) {
  if (LAGUNA_DEFAULT_SOURCE_CATEGORY) return LAGUNA_DEFAULT_SOURCE_CATEGORY;

  var hasUsinagem = false;
  var hasCortes = false;
  spreadsheet.getSheets().forEach(function(sheet) {
    var name = normalizeLagunaText_(sheet.getName());
    if (name.indexOf("usi per") !== -1) hasUsinagem = true;
    if (name.indexOf("crt per") !== -1) hasCortes = true;
  });

  if (hasUsinagem) return "Usinagem";
  if (hasCortes) return "Cortes";
  return "Usinagem";
}

function configureLagunaExternalApiFromMenu() {
  var ui = SpreadsheetApp.getUi();
  var urlResponse = ui.prompt(
    "Configurar API Externa",
    "Informe a URL completa que recebera os dados do BI Laguna via POST JSON.\nPadrao: " + getLagunaDefaultApiUrl_(),
    ui.ButtonSet.OK_CANCEL
  );

  if (urlResponse.getSelectedButton() !== ui.Button.OK) return;

  var apiUrl = urlResponse.getResponseText().trim() || getLagunaDefaultApiUrl_();
  if (!apiUrl) {
    ui.alert("URL invalida", "A URL da API externa nao pode ficar vazia.", ui.ButtonSet.OK);
    return;
  }

  var tokenResponse = ui.prompt(
    "Token da API",
    "Informe o token Bearer, se existir. Deixe em branco se a API nao usar token:",
    ui.ButtonSet.OK_CANCEL
  );

  if (tokenResponse.getSelectedButton() !== ui.Button.OK) return;

  configureLagunaExternalApi(apiUrl, tokenResponse.getResponseText().trim());
  ui.alert("API configurada", "A API externa foi configurada para receber os dados do BI Laguna.", ui.ButtonSet.OK);
}

function sendLagunaBiDataToExternalApi() {
  var properties = PropertiesService.getScriptProperties();
  var apiUrl = properties.getProperty(LAGUNA_API_URL_PROPERTY) || getLagunaDefaultApiUrl_();
  var apiToken = properties.getProperty(LAGUNA_API_TOKEN_PROPERTY);

  if (!apiUrl) {
    return {
      ok: false,
      message: "API externa nao configurada. Defina LAGUNA_API_URL nas propriedades do script ou use configureLagunaExternalApi(apiUrl, apiToken)."
    };
  }

  var payload = getLagunaBiPayload_();
  var headers = {
    "Content-Type": "application/json"
  };
  if (apiToken) {
    headers.Authorization = "Bearer " + apiToken;
  }

  var response = UrlFetchApp.fetch(apiUrl, {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  return {
    ok: response.getResponseCode() >= 200 && response.getResponseCode() < 300,
    statusCode: response.getResponseCode(),
    responseText: response.getContentText(),
    sentAt: new Date().toISOString()
  };
}

function sendLagunaPendingSourcesToExternalApi() {
  var properties = PropertiesService.getScriptProperties();
  var apiUrl = properties.getProperty(LAGUNA_API_URL_PROPERTY) || getLagunaDefaultApiUrl_();
  var apiToken = properties.getProperty(LAGUNA_API_TOKEN_PROPERTY);

  if (!apiUrl) {
    return {
      ok: false,
      message: "API externa nao configurada. Use o menu Configurar API Externa."
    };
  }

  var extraction = extractLagunaPendingSources_();
  if (!extraction.payloads.length) {
    return {
      ok: false,
      message: "Nenhum payload valido para enviar.\n\n" + extraction.message
    };
  }

  var headers = {
    "Content-Type": "application/json"
  };
  if (apiToken) {
    headers.Authorization = "Bearer " + apiToken;
  }

  var batchUrl = getLagunaBatchIngestUrl_(apiUrl);
  var response = UrlFetchApp.fetch(batchUrl, {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify({
      ok: true,
      app: "BI Laguna",
      payloadType: "batch",
      generatedAt: new Date().toISOString(),
      payloads: extraction.payloads
    }),
    muteHttpExceptions: true
  });

  return {
    ok: response.getResponseCode() >= 200 && response.getResponseCode() < 300,
    statusCode: response.getResponseCode(),
    responseText: response.getContentText(),
    sentAt: new Date().toISOString(),
    extracted: extraction.payloads.length,
    message: extraction.message
  };
}

function getLagunaBatchIngestUrl_(apiUrl) {
  var cleanUrl = String(apiUrl || "").replace(/\/+$/, "");
  if (/\/api\/ingest-batch$/i.test(cleanUrl)) return cleanUrl;
  if (/\/api\/ingest$/i.test(cleanUrl)) return cleanUrl.replace(/\/api\/ingest$/i, "/api/ingest-batch");
  return cleanUrl + "/api/ingest-batch";
}

function testLagunaExternalApiFromMenu() {
  var result = testLagunaExternalApi_();
  SpreadsheetApp.getUi().alert(
    result.ok ? "API conectada" : "Falha na conexao",
    result.message,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function testLagunaExternalApi_() {
  var properties = PropertiesService.getScriptProperties();
  var apiUrl = properties.getProperty(LAGUNA_API_URL_PROPERTY) || getLagunaDefaultApiUrl_();
  var apiToken = properties.getProperty(LAGUNA_API_TOKEN_PROPERTY);

  if (!apiUrl) {
    return {
      ok: false,
      message: "API externa nao configurada. Use o menu Configurar API Externa."
    };
  }

  var healthUrl = apiUrl
    .replace(/\/api\/ingest-batch\/?$/i, "/api/health")
    .replace(/\/api\/ingest\/?$/i, "/api/health");
  var headers = {};
  if (apiToken) {
    headers.Authorization = "Bearer " + apiToken;
  }

  try {
    var response = UrlFetchApp.fetch(healthUrl, {
      method: "get",
      headers: headers,
      muteHttpExceptions: true
    });
    var ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300;
    return {
      ok: ok,
      message: "URL testada: " + healthUrl + "\nStatus: " + response.getResponseCode() + "\nResposta: " + response.getContentText()
    };
  } catch (error) {
    return {
      ok: false,
      message: "URL testada: " + healthUrl + "\nErro: " + error.message
    };
  }
}

function sendLagunaBiDataFromMenu() {
  var result = sendLagunaBiDataToExternalApi();
  SpreadsheetApp.getUi().alert(
    result.ok ? "Envio concluido" : "Envio nao concluido",
    result.ok
      ? buildLagunaApiResponseMessage_(result)
      : (result.message || ("Status: " + result.statusCode + "\n" + result.responseText)),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function sendLagunaPendingSourcesToExternalApiFromMenu() {
  var result = sendLagunaPendingSourcesToExternalApi();
  SpreadsheetApp.getUi().alert(
    result.ok ? "Envio em lote concluido" : "Envio em lote nao concluido",
    result.ok
      ? "Origens enviadas: " + result.extracted + "\nStatus: " + result.statusCode + "\n\n" + buildLagunaApiResponseMessage_(result)
      : (result.message || ("Status: " + result.statusCode + "\n" + result.responseText)),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function buildLagunaApiResponseMessage_(result) {
  var message = ["Dados enviados para a API externa com sucesso."];
  if (!result.responseText) return message.join("\n");

  try {
    var response = JSON.parse(result.responseText);
    if (response.validation) {
      message.push(formatLagunaValidation_(response.validation));
    }
    if (response.validations && response.validations.length) {
      response.validations.slice(0, 8).forEach(function(item) {
        var source = item.source || {};
        message.push((source.name || source.key || "Origem") + ":\n" + formatLagunaValidation_(item.validation));
      });
      if (response.validations.length > 8) {
        message.push("Outras origens: " + (response.validations.length - 8));
      }
    }
  } catch (error) {
    message.push(result.responseText);
  }

  return message.join("\n\n");
}

function formatLagunaValidation_(validation) {
  if (!validation) return "Validacao indisponivel.";
  var delta = validation.delta || {};
  return [
    "Leitura anterior: " + (validation.hasPreviousRead ? "sim" : "nao"),
    "Leitura repetida: " + (validation.isRepeatRead ? "sim" : "nao"),
    "Novos cortes: " + (delta.cuts || 0),
    "Novos metros: " + (delta.lengthMeters || 0),
    "Novas horas: " + (delta.timeHours || 0)
  ].join("\n");
}

function getApiRoute_(e) {
  if (!e || !e.parameter) return "dashboard";
  return String(e.parameter.route || e.parameter.action || "dashboard").toLowerCase();
}

function parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
