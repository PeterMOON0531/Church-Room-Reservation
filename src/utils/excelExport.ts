import type { Reservation } from '../types';
import { formatDateTimeRange } from './datetime';
import { RESERVATION_STATUS_LABEL } from '../constants';

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadReservationsExcel(
  reservations: Reservation[],
  filename = 'reservations.csv',
) {
  const headers = [
    '방',
    '부서',
    '예약자',
    '전화번호',
    '일정',
    '사용목적',
    '상태',
    '비고',
    '거절사유',
  ];

  const rows = reservations.map((item) => [
    item.room_name ?? '',
    item.department_name ?? '',
    item.contact_name ?? '',
    item.contact_phone ?? '',
    formatDateTimeRange(item.start_at, item.end_at),
    item.purpose ?? item.title ?? '',
    RESERVATION_STATUS_LABEL[item.status] ?? item.status,
    item.notes ?? '',
    item.rejection_reason ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(','))
    .join('\n');

  // Excel-friendly UTF-8 BOM
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
