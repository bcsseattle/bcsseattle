import 'server-only';
import QRCode from 'qrcode';
import { getURL } from '@/utils/helpers';

/** The link the event QR code opens, and the code itself as SVG (drawn here, never by an outside service). */
export const eventVoteUrl = (id: string) => getURL(`/vote/${id}`);
export const eventVoteQr = (id: string) => QRCode.toString(eventVoteUrl(id), { type: 'svg', margin: 2, errorCorrectionLevel: 'M' });
