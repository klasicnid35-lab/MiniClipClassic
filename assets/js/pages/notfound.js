// 404.html
import { boot } from '../core/boot.js';
import { renderRightColumn } from '../../../components/rightcol.js';

const lib = await boot();
renderRightColumn(lib, { daily: false });
