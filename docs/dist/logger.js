/*
 * Copyright (C) 2020 Intel Corporation.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms and conditions of the GNU General Public License,
 * version 2, as published by the Free Software Foundation.
 *
 * This program is distributed in the hope it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin St - Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */
const DEBUG = false;
/**
 * Logger function.
 *
 * @param {string} lvl - log level ('log', 'debug', 'info', 'warn', 'err'),
 * @param {string} msg - log message,
 * @param {string} fun - calling function name.
 */

const log = function (lvl, msg, fun) {
  const d = new Date();
  const timestamp = '[' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds() + ']';
  let stackEntry = new Error().stack.split('\n')[2];

  if (typeof stackEntry === 'undefined' || stackEntry === null) {
    stackEntry = new Error().stack.split('\n')[1];
  }

  if (typeof fun === 'undefined' || fun === null) {
    if (stackEntry.indexOf('at') !== -1) {
      const idx1 = stackEntry.indexOf('at') + 3;
      const idx2 = stackEntry.lastIndexOf(' ');
      fun = stackEntry.substring(idx1, idx2);
    }

    if (typeof fun === 'undefined' || fun === null || fun.length <= 1) {
      fun = 'anonymous';
    }
  }

  const idx = stackEntry.lastIndexOf('/');
  let file;

  if (idx !== -1) {
    file = stackEntry.substring(idx + 1, stackEntry.length - 1);
  } else {
    file = stackEntry.substring(stackEntry.lastIndexOf('\\') + 1, stackEntry.length - 1);
  }

  if (typeof file === 'undefined' || file === null) {
    file = '<>';
  }

  const m = timestamp + ' ' + file + '::' + fun + '(): ' + msg;

  switch (lvl) {
    case 'log':
      if (DEBUG === true) console.log(m);
      break;

    case 'debug':
      if (DEBUG === true) console.log(m);
      break;

    case 'info':
      if (DEBUG === true) console.info(m);
      break;

    case 'warn':
      console.warn(m);
      break;

    case 'err':
      console.error(m);
      break;

    default:
      console.log(m);
      break;
  }
};

export { DEBUG, log };