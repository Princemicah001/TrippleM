import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Download,
  Calendar,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Layers
} from 'lucide-react';
import { Business, Transaction, TeamMember, CurrentUser } from '../types';
import { logAction } from '../db';

interface OwnerAnalyticsProps {
  businesses: Business[];
  transactions: Transaction[];
  team: TeamMember[];
  onShowToast: (msg: string, isError?: boolean) => void;
  currencySymbol?: string;
  currentUser: CurrentUser | null;
}

export default function OwnerAnalytics({
  businesses,
  transactions,
  team,
  onShowToast,
  currencySymbol = 'KSh',
  currentUser,
}: OwnerAnalyticsProps) {
  // Timeline selection: 'week' (7 days), 'month' (30 days), 'all' (Jan 1 to date)
  const [timeline, setTimeline] = useState<'week' | 'month' | 'all'>('month');
  const [selectedBizId, setSelectedBizId] = useState<string>('all');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Hovered index state for active SVG graph tooltip
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatCurrency = (val: number) => {
    return currencySymbol + ' ' + (val || 0).toLocaleString('en-US');
  };

  const getBusinessName = (bizId: string) => {
    return businesses.find((b) => b.id === bizId)?.name || 'HQ Managed';
  };

  const getStaffName = (userId: string) => {
    return team.find((t) => t.id === userId)?.name || 'System Admin';
  };

  // --- Core Calculations ---
  const now = new Date();
  const daysList: { date: Date; dateKey: string; label: string; rev: number; exp: number }[] = [];

  // Determine correct date scope and generate dynamic items
  if (timeline === 'all') {
    // Generate dynamic monthly items, from January to the current month in sequence
    const currentMonthIndex = now.getMonth();
    for (let m = 0; m <= currentMonthIndex; m++) {
      const d = new Date(now.getFullYear(), m, 1);
      const label = monthNames[m];
      const shortLabel = label.substring(0, 3);
      daysList.push({
        date: d,
        dateKey: `month-${m}`,
        label: shortLabel,
        rev: 0,
        exp: 0,
      });
    }
  } else {
    let dateCount = 7; // default (week)
    if (timeline === 'week') {
      dateCount = 7;
    } else if (timeline === 'month') {
      // Past days on that very month up to today
      dateCount = now.getDate();
    }

    // Generate dynamic past days
    for (let i = dateCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      daysList.push({ date: d, dateKey, label, rev: 0, exp: 0 });
    }
  }

  // Filter and tally transaction data
  transactions.forEach((t) => {
    const matchesBiz = selectedBizId === 'all' || t.bizId === selectedBizId;
    if (matchesBiz) {
      if (timeline === 'all') {
        const tDate = new Date(t.time);
        if (tDate.getFullYear() === now.getFullYear()) {
          const m = tDate.getMonth();
          if (m <= now.getMonth() && daysList[m]) {
            if (t.type === 'sale') {
              daysList[m].rev += t.amount;
            } else if (t.type === 'expense') {
              daysList[m].exp += t.amount;
            }
          }
        }
      } else {
        const dateKey = t.time.split('T')[0];
        const targetDay = daysList.find((day) => day.dateKey === dateKey);
        if (targetDay) {
          if (t.type === 'sale') {
            targetDay.rev += t.amount;
          } else if (t.type === 'expense') {
            targetDay.exp += t.amount;
          }
        }
      }
    }
  });

  // Calculate dynamic constraints for render math
  const maxRevenue = Math.max(...daysList.map((d) => d.rev), 1000);
  const maxExpense = Math.max(...daysList.map((d) => d.exp), 1000);
  const maxGraphVal = Math.max(maxRevenue, maxExpense) * 1.15; // padding ceiling factor

  // --- Dynamic Breakdown Figures and Statistics ---
  const expenseCategories: { [cat: string]: number } = {};
  const branchSales: { [branchId: string]: number } = {};
  
  let grossRevSum = 0;
  let totalExpSum = 0;

  // Filter transactions exactly inside the current active scope for metadata stats
  const activeScopeStart = daysList[0]?.date || new Date();
  activeScopeStart.setHours(0, 0, 0, 0);

  transactions.forEach((t) => {
    const tDate = new Date(t.time);
    const matchesBiz = selectedBizId === 'all' || t.bizId === selectedBizId;
    if (tDate >= activeScopeStart && matchesBiz) {
      if (t.type === 'sale') {
        grossRevSum += t.amount;
        branchSales[t.bizId] = (branchSales[t.bizId] || 0) + t.amount;
      } else if (t.type === 'expense') {
        totalExpSum += t.amount;
        const cat = t.category || 'Other Operational';
        expenseCategories[cat] = (expenseCategories[cat] || 0) + t.amount;
      }
    }
  });

  const expenseCategoryList = Object.entries(expenseCategories)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const branchSalesList = Object.entries(branchSales)
    .map(([bizId, amount]) => ({
      bizId,
      name: getBusinessName(bizId),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // --- Calculate Business Performance and Goods Movements ---
  let totalSalesCount = 0;
  let totalItemsSold = 0;
  let totalRestocksCount = 0;
  let totalRestocksCost = 0;

  const productSummary: {
    [name: string]: {
      soldQty: number;
      soldValue: number;
      restockedQty: number;
      restockedValue: number;
      bizId?: string;
    };
  } = {};

  const chronologicalMovements: {
    time: string;
    type: 'Inflow (Restock)' | 'Outflow (Sale)';
    itemName: string;
    qty: number;
    amount: number;
    bizName: string;
  }[] = [];

  transactions.forEach((t) => {
    const tDate = new Date(t.time);
    const matchesBiz = selectedBizId === 'all' || t.bizId === selectedBizId;
    if (tDate >= activeScopeStart && matchesBiz) {
      const bizName = getBusinessName(t.bizId);
      if (t.type === 'sale') {
        totalSalesCount++;
        let itemsCountInTx = 0;
        if (t.cart && t.cart.length > 0) {
          t.cart.forEach((c) => {
            const qty = c.qty || 0;
            itemsCountInTx += qty;
            totalItemsSold += qty;

            const name = c.name;
            if (!productSummary[name]) {
              productSummary[name] = { soldQty: 0, soldValue: 0, restockedQty: 0, restockedValue: 0, bizId: t.bizId };
            }
            productSummary[name].soldQty += qty;
            productSummary[name].soldValue += qty * (c.price || 0);

            chronologicalMovements.push({
              time: t.time,
              type: 'Outflow (Sale)',
              itemName: name,
              qty: qty,
              amount: qty * (c.price || 0),
              bizName,
            });
          });
        } else {
          const qty = t.items || 1;
          totalItemsSold += qty;
          const name = t.details || 'Miscellaneous Sale';
          if (!productSummary[name]) {
            productSummary[name] = { soldQty: 0, soldValue: 0, restockedQty: 0, restockedValue: 0, bizId: t.bizId };
          }
          productSummary[name].soldQty += qty;
          productSummary[name].soldValue += t.amount;

          chronologicalMovements.push({
            time: t.time,
            type: 'Outflow (Sale)',
            itemName: name,
            qty: qty,
            amount: t.amount,
            bizName,
          });
        }
      } else if (t.type === 'expense' && (t.category === 'Stock' || t.category === 'inventory' || t.category === 'restock')) {
        totalRestocksCount++;
        totalRestocksCost += t.amount;

        let restockQty = 1;
        let prodName = t.details || 'Inventory Stock';
        if (t.details) {
          let match = t.details.match(/Added\s+(\d+)x\s+(.+)/i);
          if (match) {
            restockQty = parseInt(match[1], 10);
            prodName = match[2];
          } else {
            match = t.details.match(/Restocked\s+(\d+)\s+units\s+of\s+(.+)/i);
            if (match) {
              restockQty = parseInt(match[1], 10);
              prodName = match[2];
            }
          }
        }

        if (!productSummary[prodName]) {
          productSummary[prodName] = { soldQty: 0, soldValue: 0, restockedQty: 0, restockedValue: 0, bizId: t.bizId };
        }
        productSummary[prodName].restockedQty += restockQty;
        productSummary[prodName].restockedValue += t.amount;

        chronologicalMovements.push({
          time: t.time,
          type: 'Inflow (Restock)',
          itemName: prodName,
          qty: restockQty,
          amount: t.amount,
          bizName,
        });
      }
    }
  });

  chronologicalMovements.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const productMovementList = Object.entries(productSummary).map(([name, stats]) => ({
    name,
    ...stats,
  })).filter(p => p.soldQty > 0 || p.restockedQty > 0);

  // --- Calendar Cell Mapping ---
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handleMonthChange = (offset: number) => {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    setSelectedDateStr(null);
  };

  // Structured Executive Report Generators (CSV & PDF)
  const handleExportCSV = () => {
    try {
      const activeBizLabel = selectedBizId === 'all' ? 'All Registered Shops' : getBusinessName(selectedBizId);
      const spanText = timeline === 'week' ? 'Past 7 Days' : timeline === 'month' ? 'This Month to Date' : 'Year to Date by Month';

      const printedByStr = currentUser ? `${currentUser.name} (${currentUser.role === 'owner' ? 'Owner' : 'Staff'})` : 'System Admin';

      // Log who printed the report in the system audit logs!
      logAction(
        'Performance Report Printed',
        `Executive Performance Report CSV downloaded by ${printedByStr} for ${activeBizLabel} Scope (${spanText}).`
      );

      let csv = '\uFEFF'; // UTF-8 Byte Order Mark
      csv += `TRIPPLEM ENTERPRISE - DAILY BUSINESS PERFORMANCE REPORT\n`;
      csv += `Outlet,${activeBizLabel}\n`;
      csv += `Period,${spanText}\n`;
      csv += `Base Currency,${currencySymbol}\n`;
      csv += `Exported At,${new Date().toLocaleString()}\n`;
      csv += `Printed By,${printedByStr}\n\n`;

      csv += `Period/Date,Sales Income (${currencySymbol}),Overhead Expenses (${currencySymbol}),Net Profit/Loss (${currencySymbol}),Status\n`;

      daysList.forEach((day) => {
        const netMargin = day.rev - day.exp;
        const status = netMargin > 0 ? 'PROFIT' : netMargin < 0 ? 'LOSS' : 'BREAK-EVEN';
        const formattedDate = timeline === 'all'
          ? day.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
          : day.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
        csv += `"${formattedDate}",${day.rev.toFixed(2)},${day.exp.toFixed(2)},${netMargin.toFixed(2)},"${status}"\n`;
      });

      csv += `\n`;
      csv += `AGGREGATED ANALYSIS SUMMARY\n`;
      csv += `Total Gross Sales (${currencySymbol}),${grossRevSum.toFixed(2)}\n`;
      csv += `Total Overhead Expenses (${currencySymbol}),${totalExpSum.toFixed(2)}\n`;
      csv += `Net Corporate Profit/Loss (${currencySymbol}),${(grossRevSum - totalExpSum).toFixed(2)}\n\n`;

      csv += `BUSINESS PERFORMANCE KPIs\n`;
      csv += `Metric,Value\n`;
      csv += `"Total Checkout Sales (Transactions Count)",${totalSalesCount}\n`;
      csv += `"Total Product Items Sold (Volume)",${totalItemsSold}\n`;
      csv += `"Average Checkout Basket Ticket Size",${(totalSalesCount > 0 ? grossRevSum / totalSalesCount : 0).toFixed(2)}\n`;
      csv += `"Total Stock Replenishments Count",${totalRestocksCount}\n`;
      csv += `"Total Procurement Cost (Capital Outflow)",${totalRestocksCost.toFixed(2)}\n`;
      csv += `"Net Operating Position",${(grossRevSum - totalExpSum).toFixed(2)}\n\n`;

      csv += `GOODS MOVEMENTS SUMMARY (INVENTORY TURNOVER)\n`;
      csv += `Product Name,Sold Qty (Outflow),Sales Value (${currencySymbol}),Restocked Qty (Inflow),Procurement Cost (${currencySymbol})\n`;
      productMovementList.forEach((p) => {
        csv += `"${p.name}",${p.soldQty},${p.soldValue.toFixed(2)},${p.restockedQty},${p.restockedValue.toFixed(2)}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tripplem_daily_performance_${timeline}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast('CSV dynamic spreadsheet compiled successfully.');
    } catch (e) {
      onShowToast('CSV execution failed: ' + String(e), true);
    }
  };

  const handleExportPDF = () => {
    try {
      const activeBizLabel = selectedBizId === 'all' ? 'All Registered Shops' : getBusinessName(selectedBizId);
      const spanText = timeline === 'week' ? 'Past 7 Days' : timeline === 'month' ? 'This Month to Date' : 'Year to Date by Month';

      const printedByStr = currentUser ? `${currentUser.name} (${currentUser.role === 'owner' ? 'Owner' : 'Staff'})` : 'System Admin';

      // Log who printed the report in the system audit logs!
      logAction(
        'Performance Report Printed',
        `Executive Performance Report PDF downloaded by ${printedByStr} for ${activeBizLabel} Scope (${spanText}).`
      );

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Branding Styles
      const primaryColor = [15, 23, 42]; // Slate 900
      const secondaryColor = [100, 116, 139]; // Slate 500
      const lightBg = [248, 250, 252]; // Slate 50
      const borderLineColor = [226, 232, 240]; // Slate 200

      // Title header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('TRIPPLEM ENTERPRISE', 15, 25);

      // Subtitle tagline
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('OFFICIAL EXECUTIVE SUMMARY & FINANCIAL PERFORMANCE REPORT', 15, 31);

      // Horizontal Divider
      doc.setDrawColor(borderLineColor[0], borderLineColor[1], borderLineColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, 35, 195, 35);

      // Metadata Overview Columns
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Report Specifications:', 15, 43);

      doc.setFont('Helvetica', 'normal');
      doc.text(`Timeline Window: ${spanText}`, 15, 48);
      doc.text(`Target Scope: ${activeBizLabel}`, 15, 52);
      doc.text(`Generated At: ${new Date().toLocaleString()}`, 115, 48);
      doc.text(`Base Currency: ${currencySymbol}`, 115, 52);
      doc.text(`Printed By: ${printedByStr}`, 15, 56);

      // KPI cards backing section
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, 60, 180, 24, 'F');
      doc.setDrawColor(borderLineColor[0], borderLineColor[1], borderLineColor[2]);
      doc.rect(15, 60, 180, 24, 'S');

      // Col 1: Sales Summary
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('AGGREGATE REVENUE', 24, 68);
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${currencySymbol} ${grossRevSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 24, 76);

      // Col 2: Total Expenses Summary
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('TOTAL EXPENSES', 85, 68);
      doc.setFontSize(13);
      doc.setTextColor(244, 63, 94); // red
      doc.text(`${currencySymbol} ${totalExpSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 85, 76);

      // Col 3: Net margin outcomes
      const netProfit = grossRevSum - totalExpSum;
      const profitColor = netProfit >= 0 ? [16, 185, 129] : [244, 63, 94];

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('NET BALANCE', 145, 68);
      doc.setFontSize(13);
      doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
      doc.text(`${currencySymbol} ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 145, 76);

      // Label below card segment
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(timeline === 'all' ? 'Monthly Performance Matrix' : 'Daily Sales vs Operational Overheads Matrix', 15, 96);

      // Table Header definitions
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, 102, 180, 8, 'F');

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(timeline === 'all' ? 'Month' : 'Date', 20, 107.5);
      doc.text('Sales / Income', 70, 107.5);
      doc.text('Expenses / Outflow', 115, 107.5);
      doc.text('Net Balance Difference', 160, 107.5);

      let currentY = 110;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      daysList.forEach((day, index) => {
        // Multi-page layout verification safeguards
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;

          // Redraw Table Headers on new sheet
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(15, currentY, 180, 8, 'F');
          doc.setFontSize(8);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(timeline === 'all' ? 'Month' : 'Date', 20, currentY + 5.5);
          doc.text('Sales / Income', 70, currentY + 5.5);
          doc.text('Expenses / Outflow', 115, currentY + 5.5);
          doc.text('Net Balance Difference', 160, currentY + 5.5);
          currentY += 8;
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        }

        // Zebra rows
        if (index % 2 === 0) {
          doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
          doc.rect(15, currentY, 180, 7.2, 'F');
        }

        const formattedDate = timeline === 'all'
          ? day.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const dayMargin = day.rev - day.exp;

        doc.setFont('Helvetica', 'normal');
        doc.text(formattedDate, 20, currentY + 5);
        doc.text(`${currencySymbol} ${day.rev.toLocaleString()}`, 70, currentY + 5);
        doc.text(`${currencySymbol} ${day.exp.toLocaleString()}`, 115, currentY + 5);

        // Highlight custom balance alerts colors
        if (dayMargin > 0) {
          doc.setTextColor(16, 185, 129); // green
          doc.setFont('Helvetica', 'bold');
        } else if (dayMargin < 0) {
          doc.setTextColor(244, 63, 94); // red
          doc.setFont('Helvetica', 'bold');
        } else {
          doc.setTextColor(100, 116, 139); // slate
        }

        doc.text(`${currencySymbol} ${dayMargin.toLocaleString()}`, 160, currentY + 5);

        // Reset states
        doc.setTextColor(51, 65, 85);
        doc.setFont('Helvetica', 'normal');

        // Draw Row Bottom borders
        doc.setDrawColor(borderLineColor[0], borderLineColor[1], borderLineColor[2]);
        doc.setLineWidth(0.25);
        doc.line(15, currentY + 7.2, 195, currentY + 7.2);

        currentY += 7.2;
      });

      // --- business performance matrix table section ---
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 12;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Operational Business Performance summary', 15, currentY);

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY + 3, 180, 8, 'F');

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Performance Indicator / Operational Metric', 20, currentY + 8.5);
      doc.text('Consolidated Aggregate Metrics Value', 130, currentY + 8.5);

      currentY += 11;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const kpiRows = [
        { label: 'Total Number of Checkout Sales (Transactions Count)', val: `${totalSalesCount} transactions` },
        { label: 'Total Capital Unit Stock Volume Sold', val: `${totalItemsSold} units` },
        { label: 'Average Checkout Basket Ticket Size', val: `${currencySymbol} ${(totalSalesCount > 0 ? grossRevSum / totalSalesCount : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Total Stock Replenishments Events Logged', val: `${totalRestocksCount} restock actions` },
        { label: 'Total Cost Outlay on Procured Inflow Stock', val: `${currencySymbol} ${totalRestocksCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Consolidated Gross Register Outflow (Expense Matrix)', val: `${currencySymbol} ${totalExpSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Net Cumulative Operational Surplus / Margin', val: `${currencySymbol} ${(grossRevSum - totalExpSum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
      ];

      kpiRows.forEach((row, rIdx) => {
        if (rIdx % 2 === 0) {
          doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
          doc.rect(15, currentY, 180, 7.2, 'F');
        }

        doc.setFont('Helvetica', 'normal');
        doc.text(row.label, 20, currentY + 5);

        if (rIdx === 6) {
          const netVal = grossRevSum - totalExpSum;
          doc.setTextColor(netVal >= 0 ? 16 : 244, netVal >= 0 ? 185 : 63, netVal >= 0 ? 129 : 94);
          doc.setFont('Helvetica', 'bold');
        } else {
          doc.setTextColor(51, 65, 85);
          doc.setFont('Helvetica', 'bold');
        }

        doc.text(row.val, 130, currentY + 5);

        doc.setDrawColor(borderLineColor[0], borderLineColor[1], borderLineColor[2]);
        doc.setLineWidth(0.25);
        doc.line(15, currentY + 7.2, 195, currentY + 7.2);
        currentY += 7.2;
      });

      // --- goods movements section ---
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 12;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Goods Movements & Stock Inventory Turnover', 15, currentY);

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY + 3, 180, 8, 'F');

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Product Item Catalog', 20, currentY + 8.5);
      doc.text('Outflow (Sold)', 75, currentY + 8.5);
      doc.text('Net Revenue Received', 105, currentY + 8.5);
      doc.text('Inflow (Restocked)', 140, currentY + 8.5);
      doc.text('Unit Expense Paid', 170, currentY + 8.5);

      currentY += 11;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      if (productMovementList.length > 0) {
        productMovementList.forEach((item, pIdx) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;

            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(15, currentY, 180, 8, 'F');
            doc.setFontSize(8);
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('Product Item Catalog', 20, currentY + 5.5);
            doc.text('Outflow (Sold)', 75, currentY + 5.5);
            doc.text('Net Revenue Received', 105, currentY + 5.5);
            doc.text('Inflow (Restocked)', 140, currentY + 5.5);
            doc.text('Unit Expense Paid', 170, currentY + 5.5);
            currentY += 8;
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
          }

          if (pIdx % 2 === 0) {
            doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
            doc.rect(15, currentY, 180, 7.2, 'F');
          }

          doc.setFont('Helvetica', 'bold');
          doc.text(item.name.substring(0, 24), 20, currentY + 5);

          doc.setFont('Helvetica', 'normal');
          doc.text(`${item.soldQty} units`, 75, currentY + 5);
          doc.text(`${currencySymbol} ${item.soldValue.toLocaleString()}`, 105, currentY + 5);
          doc.text(`${item.restockedQty} units`, 140, currentY + 5);
          doc.text(`${currencySymbol} ${item.restockedValue.toLocaleString()}`, 170, currentY + 5);

          doc.setDrawColor(borderLineColor[0], borderLineColor[1], borderLineColor[2]);
          doc.setLineWidth(0.25);
          doc.line(15, currentY + 7.2, 195, currentY + 7.2);
          currentY += 7.2;
        });
      } else {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(15, currentY, 180, 10, 'F');
        doc.setFont('Helvetica', 'italic');
        doc.text('No active product unit flows (sales or replenishment) registered during this period range.', 20, currentY + 6);
        currentY += 10;
      }

      // Signature / Disclaimer layout
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 10;
      }
      doc.setDrawColor(borderLineColor[0], borderLineColor[1], borderLineColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, currentY + 5, 195, currentY + 5);

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'italic');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('This is a platform computed financial statement designed specifically for tripplem enterprise managers.', 15, currentY + 11);
      doc.text('Values presented conform directly to active operational branch registers logs in the administrative database.', 15, currentY + 15);

      doc.save(`tripplem_executive_report_${timeline}.pdf`);
      onShowToast('PDF report compiled and downloaded successfully.');
    } catch (err) {
      onShowToast('PDF preparation failed: ' + String(err), true);
    }
  };

  // Render clear, spacious daily logs when a calendar date cell is selected
  const getSelectedDayDetails = () => {
    if (!selectedDateStr) return null;
    const dayTransactions = transactions.filter(
      (t) => t.time.split('T')[0] === selectedDateStr && (selectedBizId === 'all' || t.bizId === selectedBizId)
    );
    
    const displayDate = new Date(selectedDateStr).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <div id="calendar-logs-container" className="flex-1 flex flex-col space-y-4 animate-fade-in">
        {/* Simplified Header with ample negative space */}
        <div className="pb-3 border-b border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chronological Log for</p>
          <h4 className="text-base font-extrabold text-slate-900 mt-0.5">{displayDate}</h4>
          
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span>Aggregated Shift Balance:</span>
            <span className="text-slate-900 font-extrabold text-sm">
              {formatCurrency(
                dayTransactions.reduce((acc, t) => {
                  if (t.type === 'sale') return acc + t.amount;
                  if (t.type === 'expense') return acc - t.amount;
                  return acc;
                }, 0)
              )}
            </span>
          </div>
        </div>

        {/* Clear spaced list to ensure easy following */}
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {dayTransactions.map((t) => {
            const isSale = t.type === 'sale';
            const isExpense = t.type === 'expense';
            const cartSummary = t.cart?.map((c) => `${c.qty}x ${c.name}`).join(', ') || t.details || 'Operational record';

            return (
              <div key={t.id} className="flex justify-between items-start text-xs border-b border-slate-100 pb-3 last:border-b-0">
                <div className="flex gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                    isSale ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {isSale ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[13px] capitalize">
                      {isSale ? 'Cashier Checkout Sale' : `Expense: ${t.category}`}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      {cartSummary}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-1">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-slate-500">
                        {getBusinessName(t.bizId)}
                      </span>
                      <span>By {getStaffName(t.userId)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-extrabold text-[13px] ${isSale ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isSale ? '+' : '-'} {formatCurrency(t.amount)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    {new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}

          {dayTransactions.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No register entries or expenditures logged for this date.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Build Calendar Grid Data
  const calendarDaysElements: React.ReactNode[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDaysElements.push(
      <div key={`empty-${i}`} className="bg-slate-50 border border-slate-100 aspect-square" />
    );
  }

  for (let dIndex = 1; dIndex <= daysInMonthCount; dIndex++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dIndex).padStart(2, '0')}`;
    const dayTxs = transactions.filter(
      (tx) => tx.time.split('T')[0] === dStr && (selectedBizId === 'all' || tx.bizId === selectedBizId)
    );

    let cellColorClass = 'bg-white hover:bg-slate-50 text-slate-700';
    let balanceTypeIndicator: React.ReactNode = null;

    if (dayTxs.length > 0) {
      let dailyRev = 0;
      let dailyExp = 0;
      dayTxs.forEach((tx) => {
        if (tx.type === 'sale') dailyRev += tx.amount;
        if (tx.type === 'expense') dailyExp += tx.amount;
      });

      const netShiftProfit = dailyRev - dailyExp;

      if (netShiftProfit > 0) {
        cellColorClass = 'bg-emerald-50 border-emerald-100 text-emerald-950 font-bold hover:bg-emerald-100';
        balanceTypeIndicator = <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />;
      } else if (netShiftProfit < 0) {
        cellColorClass = 'bg-rose-50 border-rose-100 text-rose-950 font-bold hover:bg-rose-100';
        balanceTypeIndicator = <div className="w-1.5 h-1.5 rounded-full bg-rose-505 mt-1" />;
      } else {
        cellColorClass = 'bg-slate-100 border-slate-200 text-slate-800 font-bold hover:bg-slate-200';
        balanceTypeIndicator = <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1" />;
      }
    }

    const isSelected = selectedDateStr === dStr;
    const selectionRing = isSelected ? 'ring-2 ring-slate-900 border-slate-900 !bg-slate-900 !text-white z-10' : '';

    calendarDaysElements.push(
      <button
        key={`day-${dIndex}`}
        onClick={() => setSelectedDateStr(isSelected ? null : dStr)}
        className={`aspect-square flex flex-col items-center justify-center border border-slate-100 cursor-pointer transition text-[11px] relative ${cellColorClass} ${selectionRing}`}
      >
        <span className="font-bold">{dIndex}</span>
        {!isSelected && balanceTypeIndicator}
      </button>
    );
  }

  // --- Polyline points preparation for custom SVG graph ---
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 25;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  const getX = (index: number) => {
    if (daysList.length <= 1) return paddingX + graphWidth / 2;
    return paddingX + (index / (daysList.length - 1)) * graphWidth;
  };

  const getY = (val: number) => {
    return paddingY + graphHeight - (val / Math.max(maxGraphVal, 1)) * graphHeight;
  };

  const pathRevPoints = daysList.map((d, index) => `${getX(index)},${getY(d.rev)}`);
  const pathRevData = pathRevPoints.length > 0 ? `M ${pathRevPoints.join(' L ')}` : '';
  const areaRevData = pathRevPoints.length > 0 ? `${pathRevData} L ${getX(daysList.length - 1)},${paddingY + graphHeight} L ${getX(0)},${paddingY + graphHeight} Z` : '';

  const pathExpPoints = daysList.map((d, index) => `${getX(index)},${getY(d.exp)}`);
  const pathExpData = pathExpPoints.length > 0 ? `M ${pathExpPoints.join(' L ')}` : '';

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      
      {/* Settings Navigation and Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-500" /> Analytical Workspace
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Audit sales margins, operational overheads, and daily registers.
          </p>
        </div>
        
        {/* Dynamic Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="border border-slate-200 bg-slate-50 rounded-xl divide-x divide-slate-200 flex overflow-hidden">
            {/* Business filter */}
            <select
              value={selectedBizId}
              onChange={(e) => {
                setSelectedBizId(e.target.value);
                setSelectedDateStr(null);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none px-3 py-2 cursor-pointer appearance-none bg-slate-105 focus:bg-white flex-1 sm:flex-initial"
            >
              <option value="all">Enterprise Overview</option>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name}
                </option>
              ))}
            </select>

            {/* Timelines (corrected intervals) */}
            <select
              value={timeline}
              onChange={(e) => {
                setTimeline(e.target.value as any);
                setSelectedDateStr(null);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none px-3 py-2 cursor-pointer appearance-none bg-slate-105 focus:bg-white flex-1 sm:flex-initial"
            >
              <option value="week">Past 7 Days</option>
              <option value="month">This Month to Date</option>
              <option value="all">Yearly (January to Date)</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 bg-white font-bold text-xs hover:bg-slate-50 transition rounded-xl cursor-pointer shadow-xs w-full sm:w-auto shrink-0"
          >
            <Download className="w-4 h-4 text-slate-500" /> CSV Export
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition rounded-xl cursor-pointer shadow-sm w-full sm:w-auto shrink-0"
          >
            <Download className="w-4 h-4 text-slate-200" /> PDF Export
          </button>
        </div>
      </div>

      {/* Primary Line Chart (Trend Analysis) */}
      <div className="bg-white border border-slate-200 p-4 md:p-5 rounded-2xl shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Sales vs Overhead Expenses
          </h3>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-1 bg-emerald-500 rounded-full" />
              <span className="text-slate-600">Sales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-1 bg-rose-500 rounded-full" />
              <span className="text-slate-600">Expenses</span>
            </div>
          </div>
        </div>

        {/* Line graph drawing */}
        <div className="relative w-full overflow-x-auto select-none">
          <div className="min-w-[500px] relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="gradientRevFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const yVal = paddingY + ratio * graphHeight;
                const gridAmt = maxGraphVal * (1 - ratio);
                return (
                  <g key={i} className="opacity-30">
                    <line
                      x1={paddingX}
                      y1={yVal}
                      x2={width - paddingX}
                      y2={yVal}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={yVal + 3}
                      textAnchor="end"
                      fontSize="9"
                      fontWeight="bold"
                      fill="#94a3b8"
                    >
                      {gridAmt >= 1000 ? `${(gridAmt / 1000).toFixed(1)}k` : Math.round(gridAmt)}
                    </text>
                  </g>
                );
              })}

              {/* Dynamic Labels pacing */}
              {daysList.map((day, idx) => {
                // Ensure text is clean and spaced out based on timeframe
                const step = timeline === 'all' ? 1 : timeline === 'month' ? (daysList.length > 20 ? 4 : 2) : 1;
                if (idx % step !== 0) return null;
                const xVal = getX(idx);
                return (
                  <text
                    key={idx}
                    x={xVal}
                    y={height - paddingY + 16}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#94a3b8"
                  >
                    {day.label}
                  </text>
                );
              })}

              {/* Paths */}
              {areaRevData && <path d={areaRevData} fill="url(#gradientRevFill)" />}
              {pathRevData && (
                <path d={pathRevData} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              )}
              {pathExpData && (
                <path d={pathExpData} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Hover nodes trigger selectors */}
              {daysList.map((day, idx) => {
                const xVal = getX(idx);
                const colWidth = graphWidth / daysList.length;

                return (
                  <g key={idx}>
                    {hoveredDataIndex === idx && (
                      <line
                        x1={xVal}
                        y1={paddingY}
                        x2={xVal}
                        y2={paddingY + graphHeight}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    )}

                    <rect
                      x={xVal - colWidth / 2}
                      y={paddingY}
                      width={colWidth}
                      height={graphHeight}
                      fill="transparent"
                      className="cursor-crosshair animate-fade-in"
                      onMouseEnter={() => setHoveredDataIndex(idx)}
                      onMouseLeave={() => setHoveredDataIndex(null)}
                    />

                    {hoveredDataIndex === idx && (
                      <>
                        <circle cx={xVal} cy={getY(day.rev)} r="5.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                        <circle cx={xVal} cy={getY(day.exp)} r="5.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Dynamic Tooltip row */}
        <div className="h-8 mt-2 flex justify-center items-center">
          {hoveredDataIndex !== null ? (
            <div className="flex gap-4 px-4 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-md animate-slide-up">
              <span className="text-slate-350">{daysList[hoveredDataIndex].date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="border-r border-white/20" />
              <span className="text-emerald-400">Revenue: {formatCurrency(daysList[hoveredDataIndex].rev)}</span>
              <span className="text-rose-405">Expenses: {formatCurrency(daysList[hoveredDataIndex].exp)}</span>
            </div>
          ) : (
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-60">
              <Info className="w-4 h-4 text-slate-400" /> Tap register points to see values.
            </p>
          )}
        </div>
      </div>

      {/* Supplementary Graphic Breakdown widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graph 2: Sales Contribution by shop */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" /> Business Unit Sales Share
          </h3>
          {branchSalesList.length > 0 ? (
            <div className="space-y-4">
              {branchSalesList.map((item, idx) => {
                const totalSalesSum = branchSalesList.reduce((acc, curr) => acc + curr.amount, 0);
                const percent = totalSalesSum > 0 ? (item.amount / totalSalesSum) * 100 : 0;
                const colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-sky-500', 'bg-teal-500', 'bg-amber-500'];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={item.bizId} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.amount)} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-8">No branch registers logged inside active scope.</p>
          )}
        </div>

        {/* Graph 3: Expenses Category Share */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4 text-rose-500" /> Overhead Category Breakdown
          </h3>
          {expenseCategoryList.length > 0 ? (
            <div className="space-y-4">
              {expenseCategoryList.map((item, idx) => {
                const totalExpensesSum = expenseCategoryList.reduce((acc, curr) => acc + curr.amount, 0);
                const percent = totalExpensesSum > 0 ? (item.amount / totalExpensesSum) * 100 : 0;
                const colors = ['bg-rose-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500', 'bg-violet-500'];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="capitalize">{item.category}</span>
                      <span>{formatCurrency(item.amount)} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-8">No overhead records registered in active scope.</p>
          )}
        </div>
      </div>

      {/* SECTION: Business Performance Dashboard & Goods Movements Audit Tab */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Enterprise Ledger Auditing</span>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">Operational Performance & Goods Movements</h3>
          </div>
          <div className="text-xs text-slate-500 font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            Active Scope: <span className="text-slate-900 capitalize">{timeline === 'week' ? 'Past 7 Days' : timeline === 'month' ? 'This Month' : 'Year to Date'}</span>
          </div>
        </div>

        {/* 1. Extended Business Performance Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checkout Transactions</span>
            <p className="text-xl font-black text-slate-900">{totalSalesCount}</p>
            <span className="text-[10px] font-medium text-slate-500">Sales events processed</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Sales Volume</span>
            <p className="text-xl font-black text-slate-900">{totalItemsSold} units</p>
            <span className="text-[10px] font-medium text-slate-500">Products moved outbound</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Basket Size</span>
            <p className="text-xl font-black text-slate-900">
              {formatCurrency(totalSalesCount > 0 ? grossRevSum / totalSalesCount : 0)}
            </p>
            <span className="text-[10px] font-medium text-slate-500">Value per ticket</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Replenishments</span>
            <p className="text-xl font-black text-slate-900">{totalRestocksCount} events</p>
            <span className="text-[10px] font-medium text-emerald-600">Cost: {formatCurrency(totalRestocksCost)}</span>
          </div>
        </div>

        {/* 2. Goods Movements Table (Inventory Turnover) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Catalog Inventory Turnover Valuation
            </h4>
            <span className="text-[11px] font-bold text-slate-400 uppercase">{productMovementList.length} Active Items</span>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-150">
                  <tr>
                    <th className="py-2.5 px-4 font-black">Product Catalog Name</th>
                    <th className="py-2.5 px-4 text-right font-black">Units Sold (Outflow)</th>
                    <th className="py-2.5 px-4 text-right font-black">Value Generated</th>
                    <th className="py-2.5 px-4 text-right font-black">Units Restocked (Inflow)</th>
                    <th className="py-2.5 px-4 text-right font-black">Procurement Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {productMovementList.length > 0 ? (
                    productMovementList.map((product) => {
                      return (
                        <tr key={product.name} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-4 text-slate-900 font-black">{product.name}</td>
                          <td className="py-2.5 px-4 text-right text-rose-600">{product.soldQty}x</td>
                          <td className="py-2.5 px-4 text-right text-slate-900">{formatCurrency(product.soldValue)}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-600">+{product.restockedQty}x</td>
                          <td className="py-2.5 px-4 text-right text-emerald-700">{formatCurrency(product.restockedValue)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic font-medium">
                        No goods movements mapped within the active chronological scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Chronological Goods Movements Live Audit Ledger Log */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Live Audit Trail: Central Goods Movements Log
          </h4>
          <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs max-h-[240px] overflow-y-auto">
            {chronologicalMovements.length > 0 ? (
              chronologicalMovements.map((mov, mIdx) => {
                const isRestock = mov.type === 'Inflow (Restock)';
                return (
                  <div key={mIdx} className="p-3 hover:bg-slate-50/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${isRestock ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {isRestock ? 'Inflow' : 'Outflow'}
                      </span>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-950">{mov.itemName}</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <span>{mov.bizName}</span>
                          <span>•</span>
                          <span>{new Date(mov.time).toLocaleDateString()} {new Date(mov.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`font-black ${isRestock ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isRestock ? `+${mov.qty} units` : `-${mov.qty} units`}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">Value: {formatCurrency(mov.amount)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="p-6 text-center text-slate-400 italic font-medium">No real-time inventory inflows or outflows logged in active window range.</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Calendars Master Records and Daily Drilldown logs */}
      <div className="border border-slate-200 bg-white rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* Calendar Selector Block */}
          <div className="p-5 bg-slate-50/15">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" /> Daily Logs Directory
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMonthChange(-1)}
                  className="p-1.5 text-slate-550 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-800 text-xs w-28 text-center select-none uppercase tracking-wider">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <button
                  onClick={() => handleMonthChange(1)}
                  className="p-1.5 text-slate-550 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-slate-200 bg-slate-200 grid grid-cols-7 gap-[1px] rounded-xl overflow-hidden select-none">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div
                  key={d}
                  className="bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                >
                  {d}
                </div>
              ))}
              {calendarDaysElements}
            </div>

            {/* Micro Legenda keys */}
            <div className="flex gap-4 justify-between mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-100 border border-emerald-300 rounded" /> Net Profit on Shift
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-rose-100 border border-rose-300 rounded" /> Net Expense Outlay
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-white border border-slate-250 rounded" /> Rest / Non-active
              </span>
            </div>
          </div>

          {/* Drilldown Details column */}
          <div className="p-5 flex flex-col justify-between bg-white text-slate-800">
            {selectedDateStr ? (
              getSelectedDayDetails()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60 py-16">
                <MousePointerClick className="w-8 h-8 mb-2 text-slate-400" />
                <p className="text-xs text-center font-bold uppercase tracking-wider">
                  Select a date on the calendar grid to audit active shift entries.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
