import { IS_PROD } from '../constants';

export const debounce = function (func, wait, immediate) {
	var timeout; 
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

export const delay = async (amount = 1) => new Promise(done => setTimeout(done, amount));
export const once = callback => {
	let called = false;

	return (...args) => {
		if (called) return;
		called = true;
		callback(...args);
	}
}
export const getParam = (parameterName, defaultValue) => {
	var result = defaultValue, tmp = [];
	location.search
		.substr(1)
		.split("&")
		.forEach(function (item) {
			tmp = item.split("=");
			if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
		});
	return result;
}

export const readFromJSONFile = async function (file) {
  const res = await fetch(file);
  return await res.json();
}

export const removeParam = function (key, sourceURL) {
	const urlWithoutParams = sourceURL.split("?")[0];
	const hash = sourceURL.split('#')[1];
	const queryString = (sourceURL.indexOf('?') !== -1) ? sourceURL.split('?')[1] : '';
	let params = [];
	let param;

	if (queryString !== '') {
		params = queryString.split("&");
		for (let i = params.length - 1; i >= 0; i -= 1) {
			param = params[i].split('=')[0];
			if (param === key) {
				params.splice(i, 1);
			}
		}
		params = params.join('&');

		return [
			urlWithoutParams,
			params !== '' ? '?' + params : '',
			hash ? '#' + hash : ''
		].join('');
	}
	return urlWithoutParams;
}

export const ensureDemoIdInPageURL = demoId => {
	const currentURL = window.location.href;
	const hash = currentURL.split('#')[1];

	history.pushState(null, null, `/e/${ demoId }${ hash ? '#' + hash : '' }`);
}

export const ensureUniqueFileName = (filename) => {
	const tmp = filename.split('.');

	if (tmp.length === 1) {
		return tmp[0] + '.1';
	} else if (tmp.length === 2) {
		return `${ tmp[0] }.1.${ tmp[1] }`;
	} else {
		const ext = tmp.pop();
		const num = tmp.pop();

		if (isNaN(parseInt(num))) {
			return `${ tmp.join('.') }.${ num }.1.${ ext }`;
		} else {
			return `${ tmp.join('.') }.${ (parseInt(num)+1) }.${ ext }`;
		}
	}
}

export const isArray = function (a) {
  return Object.prototype.toString.call(a) === '[object Array]'
}
