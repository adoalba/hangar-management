import React from 'react';
import { TagColor } from '../types';

interface ReportPDFTemplateProps {
    reportData: {
        reportId: string;
        reportType: string;
        generatedAt: string;
        generatedBy: string;
        summary: {
            total: number;
            byStatus: Record<string, number>;
            percentages: Record<string, number>;
        };
        data?: any[];
        groupedData?: Record<string, any[]>;
        filtersApplied?: Record<string, string>;
    };
    t: any;
}

const ReportPDFTemplate: React.FC<ReportPDFTemplateProps> = ({ reportData, t }) => {
    const data = reportData.data || Object.values(reportData.groupedData || {}).flat();
    const reportDate = new Date(reportData.generatedAt).toLocaleString();

    const getReportTitle = () => {
        switch (reportData.reportType) {
            case 'TOTAL_INVENTORY': return 'TOTAL INVENTORY REPORT';
            case 'BY_STATUS': return 'REPORT BY CARD TYPE';
            case 'BY_LOCATION': return 'REPORT BY LOCATION';
            case 'BY_PART_NUMBER': return 'REPORT BY PART NUMBER';
            default: return 'AVIATION INVENTORY REPORT';
        }
    };

    // Columns for Section 1 (Summary Table)
    const SUMMARY_COLUMNS = [
        { key: 'statusLabel', label: 'STATUS' },
        { key: 'pn', label: 'P/N' },
        { key: 'sn', label: 'S/N' },
        { key: 'partName', label: 'DESC' },
        { key: 'location', label: 'LOC' },
        { key: 'registrationDate', label: 'REG' },
    ];

    // Split data into pages (40 items per page for Summary)
    const summaryPages = [];
    for (let i = 0; i < data.length; i += 40) {
        summaryPages.push(data.slice(i, i + 40));
    }

    const groups = [
        {
            name: "IDENTIFICATION",
            fields: [
                { k: 'Part Number', v: 'pn' }, { k: 'Serial Number', v: 'sn' },
                { k: 'Description', v: 'partName' }, { k: 'Material Status', v: 'statusLabel' }
            ]
        },
        {
            name: "TECHNICAL DATA",
            fields: [
                { k: 'Brand', v: 'brand' }, { k: 'Model', v: 'model' },
                { k: 'Location', v: 'location' }, { k: 'Bin/Shelf', v: 'physicalStorageLocation' },
                { k: 'TAT/T.T', v: 'tat' }, { k: 'TSO', v: 'tso' },
                { k: 'Shelf Life', v: 'shelfLife' }, { k: 'T.C.', v: 'tc' },
                { k: 'CSO', v: 'cso' }, { k: 'C.REM', v: 'crem' },
                { k: 'T.REM', v: 'trem' },
            ]
        },
        {
            name: "TRACEABILITY & HISTORY",
            fields: [
                { k: 'Reg. Date', v: 'registrationDate' }, { k: 'Removal Rsn', v: 'removalReason' },
                { k: 'Rej. Rsn', v: 'rejectionReason' }, { k: 'Disposition', v: 'finalDisposition' },
                { k: 'Observations', v: 'observations' }
            ]
        },
        {
            name: "ADMINISTRATIVE",
            fields: [
                { k: 'Org', v: 'organization' }, { k: 'System ID', v: 'id' },
                { k: 'Tech', v: 'technician_name' }, { k: 'Insp', v: 'inspector_name' }
            ]
        }
    ];

    return (
        <>
            <style>{`
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-after: always; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>

            {/* --- SECTION 1: INVENTORY IDENTIFICATION TABLE (SUMMARY) --- */}
            {summaryPages.map((pageData, pageIndex) => (
                <div key={`summary-${pageIndex}`} className={`w-[210mm] mx-auto bg-white text-black font-sans ${pageIndex < summaryPages.length - 1 ? 'page-break' : ''}`}>
                    {/* Header */}
                    <div className="border-b-2 border-black pb-2 mb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-lg font-black tracking-tight">WORLD CLASS AVIATION</h1>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 1: Inventory Identification (Summary)</p>
                            </div>
                            <div className="text-right">
                                <div className="border border-black px-2 py-1 bg-slate-50">
                                    <p className="text-[10px] font-black uppercase">{getReportTitle()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Metadata */}
                    <div className="flex gap-4 mb-2 text-[9px] border-b border-black pb-2">
                        <div><span className="font-bold text-slate-500">ID: </span><span className="font-mono">{reportData.reportId}</span></div>
                        <div><span className="font-bold text-slate-500">DATE: </span><span className="font-mono">{reportDate}</span></div>
                        <div><span className="font-bold text-slate-500">PAGE: </span><span className="font-mono">{pageIndex + 1} of {summaryPages.length}</span></div>
                    </div>

                    {/* Summary Table */}
                    <table className="w-full border-collapse text-[8px]">
                        <thead>
                            <tr className="bg-slate-200">
                                {SUMMARY_COLUMNS.map(col => (
                                    <th key={col.key} className="border-b border-black p-1 text-left font-black text-black">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pageData.map((item: any, idx: number) => (
                                <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    {SUMMARY_COLUMNS.map(col => (
                                        <td key={col.key} className="p-1 border-b border-slate-200 align-top">
                                            {col.key === 'statusLabel' ? (
                                                <span className="px-1 py-px border border-black text-[7px] font-bold uppercase whitespace-nowrap">
                                                    {item.statusLabel || item.tagColor}
                                                </span>
                                            ) : (
                                                <div className="truncate max-w-[150px]">
                                                    {item[col.key] || '—'}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            <div className="page-break"></div>

            {/* --- SECTION 2: TECHNICAL DETAIL BLOCKS (VERTICAL) --- */}
            <div className="w-[210mm] mx-auto bg-white text-black font-sans">
                <div className="border-b-4 border-black pb-4 mb-6">
                    <h1 className="text-xl font-black">SECTION 2: COMPONENT TECHNICAL RECORDS</h1>
                    <p className="text-[10px] text-slate-500">Detailed compliance records for {data.length} items.</p>
                </div>

                <div className="flex flex-col gap-6">
                    {data.map((item: any, idx: number) => (
                        <div key={`detail-${idx}`} className="border-b-2 border-slate-100 pb-6 mb-2 break-inside-avoid">
                            {/* Block Header */}
                            <div className="bg-black text-white px-3 py-1 flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold">P/N: {item.pn}</span>
                                <span className="text-[10px] font-bold">S/N: {item.sn}</span>
                                <span className="text-[9px] uppercase font-bold text-white border border-white px-1 rounded">{item.statusLabel}</span>
                            </div>

                            {/* Groups */}
                            {groups.map(group => (
                                <div key={group.name} className="mb-2">
                                    <div className="bg-slate-100 px-2 py-0.5 mb-1">
                                        <p className="text-[8px] font-black uppercase text-slate-700">{group.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 px-2">
                                        {/* Render pairs */}
                                        {group.fields.map((f, i) => {
                                            // Simple rendering of all fields grid
                                            return (
                                                <div key={f.k} className="flex justify-between border-b border-dotted border-slate-300">
                                                    <span className="text-[8px] font-bold text-slate-500">{f.k}</span>
                                                    <span className="text-[8px] font-mono text-black text-right max-w-[200px] break-words">
                                                        {item[f.v] || '—'}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

        </>
    );
};

export default ReportPDFTemplate;
