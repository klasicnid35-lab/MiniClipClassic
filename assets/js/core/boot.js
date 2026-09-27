// Common start-up for every page: load the data, draw header + footer.
import { getData } from './data.js';
import { renderHeader } from '../../../components/header.js';
import { renderFooter } from '../../../components/footer.js';
import { $ } from './util.js';

export async function boot() {
  renderFooter();
  try {
    const lib = await getData();
    renderHeader(lib);
    return lib;
  } catch (err) {
    renderHeader(null);
    showLoadError(err);
    throw err;
  }
}

function showLoadError(err) {
  console.error(err);
  const box = document.createElement('div');
  box.className = 'loaderror';
  const local = location.protocol === 'file:';
  box.innerHTML = '<b>Sorry, the game list could not be loaded.</b><br>' +
    (local
      ? 'This site needs to be opened through a web server (for example GitHub Pages, or run <code>npx http-server</code> in the project folder) because browsers block loading data files from <code>file://</code> pages.'
      : 'Please check your connection and <a href="javascript:location.reload()">try again</a>.');
  const content = $('#content') || $('#page');
  content.parentNode.insertBefore(box, content);
}
