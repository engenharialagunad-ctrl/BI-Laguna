var LAST_EXTRACTION_DIAGNOSTIC = "";

function getReportData(options) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var configuredCategory = "";
  try {
    configuredCategory = PropertiesService.getScriptProperties().getProperty("LAGUNA_SOURCE_CATEGORY") || "";
  } catch (error) {
    configuredCategory = "";
  }
  var defaultCategory = typeof detectLagunaDefaultCategory_ === "function"
    ? detectLagunaDefaultCategory_(spreadsheet)
    : "Usinagem";
  return getReportDataFromSpreadsheet_(spreadsheet, options || { category: configuredCategory || defaultCategory });
}

function getReportDataFromSpreadsheet_(spreadsheet, options) {
  options = options || {};
  var allSheets = spreadsheet.getSheets();
  var consolidatedData = [];
  var resultSheetNames = ["Resultados da Analise", "Resultados da Analise (Consolidado)"];
  var diagnostic = {
    allSheetNames: [],
    candidateSheets: [],
    ignoredSheets: [],
    validRows: 0,
    ignoredRows: 0
  };

  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isResultSheet(sheetName) {
    var normalizedName = normalizeText(sheetName);
    return resultSheetNames.some(function(name) {
      return normalizeText(name) === normalizedName;
    });
  }

  function isDataSheet(sheetName) {
    var normalizedName = normalizeText(sheetName);
    var isCrtPer = normalizedName.indexOf("crt per") !== -1;
    var isUsiPer = normalizedName.indexOf("usi per") !== -1;
    var mode = normalizeText(options.sheetMode || options.category || "");

    if (mode.indexOf("usinagem") !== -1 || mode.indexOf("usi") !== -1) return isUsiPer;
    if (mode.indexOf("corte") !== -1 || mode.indexOf("crt") !== -1) return isCrtPer;

    return isUsiPer;
  }

  function getSheetPatternLabel() {
    var mode = normalizeText(options.sheetMode || options.category || "");
    if (mode.indexOf("usinagem") !== -1 || mode.indexOf("usi") !== -1) return "USI PER";
    if (mode.indexOf("corte") !== -1 || mode.indexOf("crt") !== -1) return "CRT PER";
    return "USI PER";
  }

  function findColumnIndex(headers, keywords) {
    var normalizedKeywords = keywords.map(normalizeText);
    for (var i = 0; i < headers.length; i++) {
      var header = normalizeText(headers[i]);
      if (!header) continue;
      for (var j = 0; j < normalizedKeywords.length; j++) {
        if (header.indexOf(normalizedKeywords[j]) !== -1) return i;
      }
    }
    return -1;
  }

  function findExactColumnIndex(headers, names) {
    var normalizedNames = names.map(normalizeText);
    for (var i = 0; i < headers.length; i++) {
      var header = normalizeText(headers[i]);
      for (var j = 0; j < normalizedNames.length; j++) {
        if (header === normalizedNames[j]) return i;
      }
    }
    return -1;
  }

  function findRequiredColumnIndex(headers, exactNames, fallbackKeywords) {
    var exactIndex = findExactColumnIndex(headers, exactNames);
    return exactIndex !== -1 ? exactIndex : findColumnIndex(headers, fallbackKeywords);
  }

  function findHeaderInfo(displayValues) {
    var maxRowsToScan = Math.min(displayValues.length, 20);
    for (var rowIndex = 0; rowIndex < maxRowsToScan; rowIndex++) {
      var headers = displayValues[rowIndex];
      var dateTimeCol = findRequiredColumnIndex(headers, ["bipado"], ["bipado", "data e hora", "data/hora", "data hora", "data", "date", "timestamp", "inicio", "hora"]);
      var cutTypeCol = findRequiredColumnIndex(headers, ["corte"], ["tipo de corte", "corte", "angulo", "ang", "esquadro"]);
      var profileCol = findRequiredColumnIndex(headers, ["perfil 2"], ["perfil 2", "tipo de perfil", "profile", "perfil"]);
      var lengthCol = findRequiredColumnIndex(headers, ["comp"], ["comprimento", "compr.", "comp", "tamanho", "medida", "length", "mm"]);
      var quantityCol = findExactColumnIndex(headers, ["qtd", "quantidade", "qtde"]);
      var clientCol = findRequiredColumnIndex(headers, ["cliente"], ["cliente", "client"]);
      var processCol = findRequiredColumnIndex(headers, ["usinagem"], ["usinagem", "processo", "process"]);

      if (dateTimeCol !== -1 && cutTypeCol !== -1 && profileCol !== -1 && lengthCol !== -1) {
        return {
          rowIndex: rowIndex,
          dateTimeCol: dateTimeCol,
          cutTypeCol: cutTypeCol,
          profileCol: profileCol,
          lengthCol: lengthCol,
          quantityCol: quantityCol,
          clientCol: clientCol,
          processCol: processCol
        };
      }
    }
    return null;
  }

  function parseBrazilianNumber(value) {
    if (typeof value === "number") return value;
    if (value === null || value === undefined) return NaN;

    var text = String(value)
      .replace(/\s/g, "")
      .replace(/mm/ig, "")
      .replace(/[^\d,.-]/g, "");

    if (!text) return NaN;

    var commaIndex = text.lastIndexOf(",");
    var dotIndex = text.lastIndexOf(".");

    if (commaIndex !== -1 && dotIndex !== -1) {
      text = commaIndex > dotIndex
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
    } else if (commaIndex !== -1) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else if (dotIndex !== -1 && text.length - dotIndex - 1 === 3 && dotIndex > 0) {
      text = text.replace(/\./g, "");
    }

    return parseFloat(text);
  }

  function parseDateTime(rawValue, displayValue) {
    if (rawValue instanceof Date && !isNaN(rawValue.getTime())) return rawValue;

    var candidates = [displayValue, rawValue];
    for (var i = 0; i < candidates.length; i++) {
      var value = candidates[i];
      if (value === null || value === undefined || value === "") continue;

      if (typeof value === "number") {
        var serialDate = new Date(Math.round((value - 25569) * 86400 * 1000));
        if (!isNaN(serialDate.getTime())) return serialDate;
      }

      var text = String(value).trim();
      var brazilian = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (brazilian) {
        var year = Number(brazilian[3]);
        if (year < 100) year += 2000;
        var parsed = new Date(
          year,
          Number(brazilian[2]) - 1,
          Number(brazilian[1]),
          Number(brazilian[4] || 0),
          Number(brazilian[5] || 0),
          Number(brazilian[6] || 0)
        );
        if (!isNaN(parsed.getTime())) return parsed;
      }

      var fallback = new Date(text);
      if (!isNaN(fallback.getTime())) return fallback;
    }

    return null;
  }

  function parseBipadoOperator(value) {
    if (value === null || value === undefined) return "";
    var text = String(value).trim();
    var match = text.match(/por:\s*(.+?)\s+em\s+/i);
    return match ? match[1].trim() : "";
  }

  function classifyCutType(value) {
    var normalized = normalizeText(value).replace(/ graus?/g, "");
    var numbers = normalized.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      normalized = numbers[0] + "/" + numbers[1];
    } else {
      normalized = normalized.replace(/\s+/g, "").replace(/[\\|-]/g, "/");
    }

    if (normalized === "90/90") return "2 cortes retos";
    if (normalized === "45/90" || normalized === "90/45") return "1 corte reto e 1 corte em angulo";
    if (normalized === "45/45") return "2 cortes em angulo";
    return "";
  }

  diagnostic.sheetPattern = getSheetPatternLabel();

  allSheets.forEach(function(sheet) {
    var sheetName = sheet.getName();
    diagnostic.allSheetNames.push(sheetName);

    if (isResultSheet(sheetName)) return;
    if (!isDataSheet(sheetName)) return;

    diagnostic.candidateSheets.push(sheetName);
    if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
      diagnostic.ignoredSheets.push(sheetName + ": aba vazia ou sem linhas de dados");
      return;
    }

    var range = sheet.getDataRange();
    var rawValues = range.getValues();
    var displayValues = range.getDisplayValues();
    var headerInfo = findHeaderInfo(displayValues);

    if (!headerInfo) {
      diagnostic.ignoredSheets.push(sheetName + ": cabecalhos BIPADO, CORTE, PERFIL 2 e COMP nao encontrados nas primeiras 20 linhas");
      Logger.log("Aba " + sheetName + " ignorada: cabecalhos obrigatorios nao encontrados.");
      return;
    }

    for (var rowIndex = headerInfo.rowIndex + 1; rowIndex < rawValues.length; rowIndex++) {
      var rawRow = rawValues[rowIndex];
      var displayRow = displayValues[rowIndex];
      var dateTime = parseDateTime(rawRow[headerInfo.dateTimeCol], displayRow[headerInfo.dateTimeCol]);
      var cutType = displayRow[headerInfo.cutTypeCol] || rawRow[headerInfo.cutTypeCol];
      var profile = String(displayRow[headerInfo.profileCol] || rawRow[headerInfo.profileCol] || "").trim();
      var length = parseBrazilianNumber(displayRow[headerInfo.lengthCol] || rawRow[headerInfo.lengthCol]);
      var quantity = headerInfo.quantityCol === -1
        ? 1
        : parseBrazilianNumber(displayRow[headerInfo.quantityCol] || rawRow[headerInfo.quantityCol]);
      var client = headerInfo.clientCol === -1
        ? "Sem cliente"
        : String(displayRow[headerInfo.clientCol] || rawRow[headerInfo.clientCol] || "Sem cliente").trim();
      var process = headerInfo.processCol === -1
        ? "Sem processo"
        : String(displayRow[headerInfo.processCol] || rawRow[headerInfo.processCol] || "Sem processo").trim();

      if (!dateTime || !cutType || !profile || isNaN(length) || isNaN(quantity)) {
        diagnostic.ignoredRows++;
        Logger.log("Linha ignorada em " + sheetName + " linha " + (rowIndex + 1) + ": dados incompletos ou invalidos.");
        continue;
      }

      if (quantity <= 0) quantity = 1;
      diagnostic.validRows++;
      consolidatedData.push({
        dateTime: dateTime,
        cutType: cutType,
        profile: profile,
        length: length,
        quantity: quantity,
        client: client || "Sem cliente",
        process: process || "Sem processo",
        operator: parseBipadoOperator(displayRow[headerInfo.dateTimeCol] || rawRow[headerInfo.dateTimeCol]),
        sheetName: sheetName
      });
    }
  });

  LAST_EXTRACTION_DIAGNOSTIC = buildExtractionDiagnosticMessage(diagnostic);
  if (consolidatedData.length === 0) return null;

  var timezone = Session.getScriptTimeZone();
  var reportData = {
    cutTypeCounts: {
      "2 cortes retos": 0,
      "1 corte reto e 1 corte em angulo": 0,
      "2 cortes em angulo": 0
    },
    dailySummary: {},
    profileBarUsage: {},
    dailyProfileUsage: [],
    clientProcessUsage: {},
    operatorUsage: {},
    indicators: {
      totalCuts: 0,
      totalLength: 0,
      totalBars: 0,
      totalTimeMinutes: 0,
      totalClients: 0,
      totalProcesses: 0
    },
    clientProcessSummary: [],
    clientSummary: [],
    operatorSummary: []
  };

  consolidatedData.forEach(function(item) {
    var dateKey = Utilities.formatDate(item.dateTime, timezone, "yyyy-MM-dd");
    var classifiedCutType = classifyCutType(item.cutType);
    var quantity = item.quantity || 1;
    var totalLength = item.length * quantity;

    reportData.indicators.totalCuts += quantity;
    reportData.indicators.totalLength += totalLength;

    if (classifiedCutType) reportData.cutTypeCounts[classifiedCutType] += quantity;

    if (!reportData.dailySummary[dateKey]) {
      reportData.dailySummary[dateKey] = {
        totalCuts: 0,
        cutTypes: {
          "2 cortes retos": 0,
          "1 corte reto e 1 corte em angulo": 0,
          "2 cortes em angulo": 0
        },
        firstCutTime: item.dateTime.getTime(),
        lastCutTime: item.dateTime.getTime()
      };
    }

    var daySummary = reportData.dailySummary[dateKey];
    daySummary.totalCuts += quantity;
    if (classifiedCutType) daySummary.cutTypes[classifiedCutType] += quantity;
    daySummary.firstCutTime = Math.min(daySummary.firstCutTime, item.dateTime.getTime());
    daySummary.lastCutTime = Math.max(daySummary.lastCutTime, item.dateTime.getTime());

    if (!reportData.profileBarUsage[item.profile]) {
      reportData.profileBarUsage[item.profile] = {
        totalLength: 0,
        dailyUsage: {}
      };
    }
    reportData.profileBarUsage[item.profile].totalLength += totalLength;
    reportData.profileBarUsage[item.profile].dailyUsage[dateKey] =
      (reportData.profileBarUsage[item.profile].dailyUsage[dateKey] || 0) + totalLength;

    if (!reportData.clientProcessUsage[item.client]) {
      reportData.clientProcessUsage[item.client] = {};
    }
    if (!reportData.clientProcessUsage[item.client][item.process]) {
      reportData.clientProcessUsage[item.client][item.process] = {
        totalCuts: 0,
        totalLength: 0,
        cutTypes: {
          "2 cortes retos": 0,
          "1 corte reto e 1 corte em angulo": 0,
          "2 cortes em angulo": 0
        },
        firstCutTime: item.dateTime.getTime(),
        lastCutTime: item.dateTime.getTime()
      };
    }

    var processSummary = reportData.clientProcessUsage[item.client][item.process];
    processSummary.totalCuts += quantity;
    processSummary.totalLength += totalLength;
    if (classifiedCutType) processSummary.cutTypes[classifiedCutType] += quantity;
    processSummary.firstCutTime = Math.min(processSummary.firstCutTime, item.dateTime.getTime());
    processSummary.lastCutTime = Math.max(processSummary.lastCutTime, item.dateTime.getTime());

    var operatorName = item.operator || "Sem operador";
    if (!reportData.operatorUsage[operatorName]) {
      reportData.operatorUsage[operatorName] = {
        totalCuts: 0,
        firstCutTime: item.dateTime.getTime(),
        lastCutTime: item.dateTime.getTime()
      };
    }
    reportData.operatorUsage[operatorName].totalCuts += quantity;
    reportData.operatorUsage[operatorName].firstCutTime = Math.min(reportData.operatorUsage[operatorName].firstCutTime, item.dateTime.getTime());
    reportData.operatorUsage[operatorName].lastCutTime = Math.max(reportData.operatorUsage[operatorName].lastCutTime, item.dateTime.getTime());
  });

  var formattedDailySummary = [];
  Object.keys(reportData.dailySummary).sort().forEach(function(dateKey) {
    var summary = reportData.dailySummary[dateKey];
    formattedDailySummary.push({
      date: dateKey,
      totalCuts: summary.totalCuts,
      cuts2Retos: summary.cutTypes["2 cortes retos"],
      cuts1Reto1Angulo: summary.cutTypes["1 corte reto e 1 corte em angulo"],
      cuts2Angulos: summary.cutTypes["2 cortes em angulo"],
      timeTaken: ((summary.lastCutTime - summary.firstCutTime) / (1000 * 60)).toFixed(2)
    });
  });
  reportData.dailySummary = formattedDailySummary;

  var formattedProfileBarUsage = [];
  Object.keys(reportData.profileBarUsage).sort().forEach(function(profile) {
    var usage = reportData.profileBarUsage[profile];
    formattedProfileBarUsage.push({
      profile: profile,
      totalLength: usage.totalLength.toFixed(2),
      totalBars: (usage.totalLength / 6000).toFixed(2)
    });

    Object.keys(usage.dailyUsage).sort().forEach(function(dateKey) {
      var dailyLength = usage.dailyUsage[dateKey];
      reportData.dailyProfileUsage.push({
        profile: profile,
        date: dateKey,
        length: dailyLength.toFixed(2),
        bars: (dailyLength / 6000).toFixed(2)
      });
    });
  });
  reportData.profileBarUsage = formattedProfileBarUsage;

  Object.keys(reportData.operatorUsage).sort().forEach(function(operatorName) {
    var usage = reportData.operatorUsage[operatorName];
    reportData.operatorSummary.push({
      operator: operatorName,
      totalCuts: usage.totalCuts,
      timeMinutes: ((usage.lastCutTime - usage.firstCutTime) / (1000 * 60)).toFixed(2),
      firstCut: Utilities.formatDate(new Date(usage.firstCutTime), timezone, "yyyy-MM-dd HH:mm:ss"),
      lastCut: Utilities.formatDate(new Date(usage.lastCutTime), timezone, "yyyy-MM-dd HH:mm:ss")
    });
  });

  var processNames = {};
  Object.keys(reportData.clientProcessUsage).sort().forEach(function(client) {
    var clientTotals = {
      client: client,
      totalCuts: 0,
      totalLength: 0,
      totalBars: 0,
      totalTimeMinutes: 0,
      processes: 0
    };

    Object.keys(reportData.clientProcessUsage[client]).sort().forEach(function(process) {
      processNames[process] = true;
      var usage = reportData.clientProcessUsage[client][process];
      var timeMinutes = (usage.lastCutTime - usage.firstCutTime) / (1000 * 60);
      var bars = usage.totalLength / 6000;

      clientTotals.totalCuts += usage.totalCuts;
      clientTotals.totalLength += usage.totalLength;
      clientTotals.totalBars += bars;
      clientTotals.totalTimeMinutes += timeMinutes;
      clientTotals.processes++;

      reportData.clientProcessSummary.push({
        client: client,
        process: process,
        totalCuts: usage.totalCuts,
        cuts2Retos: usage.cutTypes["2 cortes retos"],
        cuts1Reto1Angulo: usage.cutTypes["1 corte reto e 1 corte em angulo"],
        cuts2Angulos: usage.cutTypes["2 cortes em angulo"],
        totalLength: usage.totalLength.toFixed(2),
        totalBars: bars.toFixed(2),
        timeMinutes: timeMinutes.toFixed(2),
        firstCut: Utilities.formatDate(new Date(usage.firstCutTime), timezone, "yyyy-MM-dd HH:mm:ss"),
        lastCut: Utilities.formatDate(new Date(usage.lastCutTime), timezone, "yyyy-MM-dd HH:mm:ss")
      });
    });

    reportData.clientSummary.push({
      client: client,
      processes: clientTotals.processes,
      totalCuts: clientTotals.totalCuts,
      totalLength: clientTotals.totalLength.toFixed(2),
      totalBars: clientTotals.totalBars.toFixed(2),
      totalTimeMinutes: clientTotals.totalTimeMinutes.toFixed(2)
    });
  });

  reportData.indicators.totalBars = (reportData.indicators.totalLength / 6000).toFixed(2);
  reportData.indicators.totalLength = reportData.indicators.totalLength.toFixed(2);
  reportData.indicators.totalTimeMinutes = reportData.clientSummary.reduce(function(total, item) {
    return total + parseFloat(item.totalTimeMinutes || 0);
  }, 0).toFixed(2);
  reportData.indicators.totalClients = reportData.clientSummary.length;
  reportData.indicators.totalProcesses = Object.keys(processNames).length;
  delete reportData.clientProcessUsage;
  delete reportData.operatorUsage;

  return reportData;
}

function buildExtractionDiagnosticMessage(diagnostic) {
  var message = [];
  message.push("Abas na planilha: " + (diagnostic.allSheetNames.length ? diagnostic.allSheetNames.join(", ") : "nenhuma"));
  message.push("Abas candidatas com " + (diagnostic.sheetPattern || "CRT PER/USI PER") + ": " + (diagnostic.candidateSheets.length ? diagnostic.candidateSheets.join(", ") : "nenhuma"));
  message.push("Linhas validas encontradas: " + diagnostic.validRows);
  message.push("Linhas ignoradas: " + diagnostic.ignoredRows);

  if (diagnostic.ignoredSheets.length) {
    message.push("Motivos: " + diagnostic.ignoredSheets.join(" | "));
  }

  return message.join("\n");
}

function getExtractionDiagnosticMessage() {
  return LAST_EXTRACTION_DIAGNOSTIC || "Nenhum diagnostico disponivel. Execute novamente a analise.";
}

function showReportSidebar() {
  var reportData = getReportData();
  if (!reportData) {
    SpreadsheetApp.getUi().alert(
      "Nenhum dado encontrado",
      "Nao foi possivel gerar o relatorio.\n\n" + getExtractionDiagnosticMessage(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  var html = HtmlService.createTemplateFromFile("PrintLayout");
  html.data = JSON.stringify(reportData);
  SpreadsheetApp.getUi().showModalDialog(
    html.evaluate().setWidth(960).setHeight(650),
    "Relatorio de Analise de Usinagem"
  );
}
