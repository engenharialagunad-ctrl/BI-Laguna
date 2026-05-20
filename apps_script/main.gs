function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("BI Laguna - Perfis Corte")
      .addItem("Processar Perfis Corte (para Planilha)", "analyzeCutsAndProfiles")
      .addItem("Gerar Relatorio (HTML)", "showReportSidebar")
      .addSeparator()
      .addItem("Abrir BI Laguna", "showLagunaBiDashboard")
      .addItem("Ver Coordenadas do Web App", "showLagunaWebAppCoordinates")
      .addItem("Configurar Origem/Categoria", "configureLagunaSourceFromMenu")
      .addSeparator()
      .addItem("Preparar Lista de Planilhas Pendentes", "setupLagunaPendingSourcesSheetFromMenu")
      .addItem("Adicionar Planilha Atual na Lista", "addActiveSpreadsheetToLagunaPendingSourcesFromMenu")
      .addItem("Extrair Planilhas Pendentes", "extractLagunaPendingSourcesFromMenu")
      .addItem("Enviar Pendentes em Lote para API", "sendLagunaPendingSourcesToExternalApiFromMenu")
      .addSeparator()
      .addItem("Configurar API Externa", "configureLagunaExternalApiFromMenu")
      .addItem("Testar API Externa", "testLagunaExternalApiFromMenu")
      .addItem("Enviar Dados para API", "sendLagunaBiDataFromMenu")
      .addToUi();
}

function analyzeCutsAndProfiles() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var reportData = getReportData();

  if (!reportData) {
    SpreadsheetApp.getUi().alert(
      "Nenhum dado encontrado",
      "Nao foi possivel gerar o relatorio.\n\n" + getExtractionDiagnosticMessage(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  var resultSheetName = "Resultados da Analise (Consolidado)";
  var resultSheet = spreadsheet.getSheetByName(resultSheetName);
  if (resultSheet) {
    resultSheet.clear();
  } else {
    resultSheet = spreadsheet.insertSheet(resultSheetName);
  }
  var rowNum = 1;

  resultSheet.getRange(rowNum++, 1).setValue("Indicadores Gerais");
  resultSheet.getRange(rowNum++, 1, 1, 6).setValues([[
    "Clientes", "Processos", "Total de Cortes", "Comprimento Total (m)", "Total de Barras", "Tempo Total de Corte (h)"
  ]]);
  resultSheet.getRange(rowNum++, 1, 1, 6).setValues([[
    reportData.indicators.totalClients,
    reportData.indicators.totalProcesses,
    reportData.indicators.totalCuts,
    reportData.indicators.totalLengthMeters,
    reportData.indicators.totalBars,
    reportData.indicators.totalTimeHours
  ]]);
  rowNum++;

  resultSheet.getRange(rowNum++, 1).setValue("Resumo por Cliente");
  resultSheet.getRange(rowNum++, 1, 1, 6).setValues([[
    "Cliente", "Processos", "Total de Cortes", "Comprimento Total (m)", "Total de Barras", "Tempo Total de Corte (h)"
  ]]);
  reportData.clientSummary.forEach(function(summary) {
    resultSheet.getRange(rowNum++, 1, 1, 6).setValues([[
      summary.client, summary.processes, summary.totalCuts,
      summary.totalLengthMeters, summary.totalBars, summary.totalTimeHours
    ]]);
  });
  rowNum++;

  resultSheet.getRange(rowNum++, 1).setValue("Tempo de Corte por Cliente e Processo");
  resultSheet.getRange(rowNum++, 1, 1, 11).setValues([[
    "Cliente", "Processo", "Total de Cortes", "2 Retos", "1 Reto e 1 Angulo", "2 Angulos",
    "Comprimento Total (m)", "Total de Barras", "Tempo Total (h)", "Primeiro BIPADO", "Ultimo BIPADO"
  ]]);
  reportData.clientProcessSummary.forEach(function(summary) {
    resultSheet.getRange(rowNum++, 1, 1, 11).setValues([[
      summary.client, summary.process, summary.totalCuts, summary.cuts2Retos,
      summary.cuts1Reto1Angulo, summary.cuts2Angulos, summary.totalLengthMeters,
      summary.totalBars, summary.timeHours, summary.firstCut, summary.lastCut
    ]]);
  });
  rowNum++;

  resultSheet.getRange(rowNum++, 1).setValue("Analise de Tipos de Corte");
  resultSheet.getRange(rowNum++, 1, 1, 2).setValues([["Tipo de Corte", "Total"]]);
  for (var type in reportData.cutTypeCounts) {
    resultSheet.getRange(rowNum++, 1, 1, 2).setValues([[type, reportData.cutTypeCounts[type]]]);
  }
  rowNum++;

  resultSheet.getRange(rowNum++, 1).setValue("Resumo Diario de Cortes");
  resultSheet.getRange(rowNum++, 1, 1, 6).setValues([[
    "Data", "Total de Cortes", "2 Retos", "1 Reto e 1 Angulo", "2 Angulos", "Tempo Total (h)"
  ]]);
  reportData.dailySummary.forEach(function(summary) {
    resultSheet.getRange(rowNum++, 1, 1, 6).setValues([[
      summary.date, summary.totalCuts, summary.cuts2Retos,
      summary.cuts1Reto1Angulo, summary.cuts2Angulos, summary.timeHours
    ]]);
  });
  rowNum++;

  resultSheet.getRange(rowNum++, 1).setValue("Uso de Barras por Perfil (Barra = 6000mm)");
  resultSheet.getRange(rowNum++, 1, 1, 3).setValues([[
    "Perfil", "Comprimento Total (m)", "Total de Barras"
  ]]);
  reportData.profileBarUsage.forEach(function(usage) {
    resultSheet.getRange(rowNum++, 1, 1, 3).setValues([[
      usage.profile, usage.totalLengthMeters, usage.totalBars
    ]]);
  });
  rowNum++;

  resultSheet.getRange(rowNum++, 1).setValue("Detalhe Diario de Uso de Barras por Perfil");
  resultSheet.getRange(rowNum++, 1, 1, 4).setValues([[
    "Perfil", "Data", "Comprimento Usinado (m)", "Barras Usinadas"
  ]]);
  reportData.dailyProfileUsage.forEach(function(detail) {
    resultSheet.getRange(rowNum++, 1, 1, 4).setValues([[
      detail.profile, detail.date, detail.lengthMeters, detail.bars
    ]]);
  });

  resultSheet.getRange(1, 1, 1, 6)
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#2f8f5b");
  resultSheet.getRange(2, 1, 1, 6)
    .setFontWeight("bold")
    .setBackground("#e9f5ee");
  resultSheet.getRange(3, 1, 1, 6)
    .setFontWeight("bold")
    .setFontSize(12)
    .setBackground("#f7fbf8");
  resultSheet.getDataRange()
    .setBorder(true, true, true, true, true, true, "#d8dee5", SpreadsheetApp.BorderStyle.SOLID);
  resultSheet.autoResizeColumns(1, resultSheet.getLastColumn());
  SpreadsheetApp.getUi().alert(
    "Analise de Perfis Corte Concluida!",
    "Os resultados consolidados foram gerados na aba \"" + resultSheetName + "\".",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
