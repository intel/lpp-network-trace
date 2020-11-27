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
import { DEBUG, log } from './logger.js';
import { precondition, assert, isValidHttpUrl, isFunction } from './utils.js';

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;

/*
 * Comparator function for numbers.
 */
function compareNumbers( a, b ) {
    return a - b;
}

let totalReceivedBytes = 0;
let totalDurationSec = 0;

/*
 * Calculates average bandwidth given array of measured bandwidth results.
 * @return {number} bandwidth in kbps
 */
function calculateBandwidth( bwArray ) {
    assert( bwArray !== undefined, 'bwArray=undefined' );
    assert( bwArray !== null, 'bwArray=null' );
    assert( bwArray.length >= 1, 'bwArray is empty' );
    const sorted = bwArray.sort( compareNumbers );
    log( 'debug', 'sorted: ' + sorted, 'calculateBandwidth' );

    // remove bottom ~22% of results
    let threshold = Math.round( sorted.length * 0.22 );
    let filtered = sorted.filter( ( el, idx ) => idx >= threshold );

    let ret;
    if ( filtered.length > 2 ) {
        // remove 2 fastest results
        threshold = filtered.length - 2;
        filtered = filtered.filter( ( el, idx ) => idx < threshold );
        log( 'debug', 'filtered: ' + filtered, 'calculateBandwidth' );
        ret = Math.round( filtered.reduce( ( a, b ) => ( a + b ) ) / filtered.length );
        log( 'debug', 'average bandwidth: ' + ret + ' kbps',
            'calculateBandwidth' );
    } else {
        // not enough data -> calculate total average value
        ret = Math.floor( ( ( totalReceivedBytes * 8 ) / 1024 ) / totalDurationSec );
        log( 'debug', 'total average bandwidth: ' + ret + ' kbps',
            'calculateBandwidth' );
    }

    assert( ret !== undefined, 'ret=undefined' );
    assert( ret !== null, 'ret=null' );
    return ret;
}

let timer = null;
let request = null;

/**
 * Starts downlink bandwidth measurement and returns bandwidth value.
 *
 * @param {number} limitKbytes - download limit (in kilobytes). Each measurement
 * will stop after this amount is downloaded,
 * @param {number} maxTimeSec - time in seconds after the measurement is stopped,
 * @param {string} url - file URL to be downloaded.
 * @param {Function} onprogress - function that is called (at least once) with 
 * percentage of download.
 * @return {Promise} resolve => downlink bandwidth in kbps,
 *                  reject => failed to download given file.
 */
function getDlBw( limitKbytes, maxTimeSec, url, onprogress ) {
    let startTimeMillis, prevTimeMillis, currentTimeMillis;
    let finalBandwidthKbps = -1;
    totalReceivedBytes = 0;
    totalDurationSec = 0;
    const bandwidthKbpsArray = [];

    precondition( limitKbytes !== null, 'limitKbytes=null' );
    precondition( Number.isInteger( +limitKbytes ),
        'limitKbytes is not an integer' );
    precondition( +limitKbytes > 0, 'limitKbytes <= 0' );
    precondition( maxTimeSec !== null, 'maxTimeSec=null' );
    precondition( Number.isInteger( +maxTimeSec ), 'maxTimeSec is not an ' +
        'integer' );
    precondition( +maxTimeSec >= 1, 'maxTimeSec < 1' );

    precondition( url !== undefined, 'url=undefined' );
    precondition( url !== null, 'url=null' );
    precondition( isValidHttpUrl( url ), 'url is not valid http(s) URL' );

    precondition( onprogress === null || onprogress === undefined ||
        isFunction( onprogress ), 'onprogress is not a function' );

    timer && window.clearTimeout( timer ); timer = null;

    return new Promise( function ( resolve, reject ) {
        if ( navigator.onLine === false ) {
            if ( onprogress !== undefined && onprogress !== null ) {
                onprogress( 0 );
            }
            reject( new Error( 'not online' ) );
            return;
        }
        request = new XMLHttpRequest();
        request.responseType = 'arraybuffer';

        request.onerror = function () {
            if ( onprogress !== undefined && onprogress !== null ) {
                onprogress( 0 );
            }
            reject( new Error( 'http(s) request failed' ) );
            timer && window.clearTimeout( timer ); timer = null;
        };

        request.onload = function ( result ) {
            if ( request.status !== HTTP_OK ) {
                if ( onprogress !== undefined && onprogress !== null ) {
                    onprogress( 0 );
                }
                reject( new Error( 'failed to fetch url: ' + request.status ) );
                timer && window.clearTimeout( timer ); timer = null;
            }
        };

        request.onloadstart = function ( result ) {
            startTimeMillis = prevTimeMillis = new Date().getTime();
        };

        request.onprogress = function ( result ) {
            currentTimeMillis = new Date().getTime();
            const receivedBytes = result.loaded - totalReceivedBytes;
            totalReceivedBytes = result.loaded;
            const durationSec = ( currentTimeMillis - prevTimeMillis ) / 1000;
            prevTimeMillis = currentTimeMillis;
            const bits = receivedBytes * 8;
            let kbps = ( bits / 1024 ) / durationSec;
            kbps = Math.floor( kbps );

            bandwidthKbpsArray.push( kbps );

            if ( DEBUG === true ) {
                log( 'debug', 'received bytes: ' + receivedBytes +
                    ', duration: ' + durationSec + ' sec' +
                    ', total bytes: ' + totalReceivedBytes +
                    ', bw: ' + kbps + ' kbps', 'XMLHttpRequest.onprogress' );
            }

            totalDurationSec =
                ( currentTimeMillis - startTimeMillis ) / 1000;

            if ( onprogress !== undefined && onprogress !== null ) {
                const dlProgress = Math.floor(
                    ( totalReceivedBytes / ( limitKbytes * 1024 ) ) * 100 );
                const timeProgress = Math.floor(
                    ( totalDurationSec / maxTimeSec ) * 100 );
                const max = Math.max( dlProgress, timeProgress );
                if ( max < 100 ) {
                    onprogress( max );
                }
            }

            if ( totalReceivedBytes >= limitKbytes * 1024 ||
                totalDurationSec > maxTimeSec ) {
                request.onreadystatechange = null;
                request.onprogress = null;
                timer && window.clearTimeout( timer ); timer = null;
                request.abort();
                finalBandwidthKbps = calculateBandwidth( bandwidthKbpsArray );
                log( 'info', 'final bandwidth: ' + finalBandwidthKbps +
                    ' kbps', 'XMLHttpRequest.onprogress' );
                if ( onprogress !== undefined && onprogress !== null ) {
                    onprogress( 100 );
                }
                resolve( finalBandwidthKbps );
            }
        };

        request.onreadystatechange = function () {
            if ( request.readyState === XMLHttpRequest.DONE ) {
                const status = request.status;
                if ( status >= HTTP_OK && status < HTTP_BAD_REQUEST ) {
                    timer && window.clearTimeout( timer ); timer = null;
                    if ( bandwidthKbpsArray.length >= 1 ) {
                        finalBandwidthKbps =
                            calculateBandwidth( bandwidthKbpsArray );
                        log( 'info', 'final bandwidth: ' + finalBandwidthKbps +
                            ' kbps', 'XMLHttpRequest.onreadystatechange' );
                        if ( onprogress !== undefined && onprogress !== null ) {
                            onprogress( 100 );
                        }
                        resolve( finalBandwidthKbps );
                    } else {
                        reject( new Error( 'failed to measure bandwidth' ) );
                    }
                }
            }
        };

        const t = ( new Date() ).getTime();
        request.open( 'get', url + '?nnn=' + t, true );

        timer = window.setTimeout( function () {
            log( 'debug', 'timed out', '<timer>' );
            request.onreadystatechange = null;
            request.onprogress = null;
            request.abort();
            if ( finalBandwidthKbps >= 0 ) {
                log( 'info', 'final bandwidth: ' + finalBandwidthKbps +
                    ' kbps', 'timer' );
                if ( onprogress !== undefined && onprogress !== null ) {
                    onprogress( 100 );
                }
                resolve( finalBandwidthKbps );
            } else {
                if ( bandwidthKbpsArray.length >= 1 ) {
                    finalBandwidthKbps =
                    calculateBandwidth( bandwidthKbpsArray );
                    log( 'info', 'final bandwidth: ' + finalBandwidthKbps +
                        ' kbps', 'timer' );
                    if ( onprogress !== undefined && onprogress !== null ) {
                        onprogress( 100 );
                    }
                    resolve( finalBandwidthKbps );
                } else {
                    reject( new Error( 'failed to measure bandwidth' ) );
                }
            }
        }, maxTimeSec * 1000 );

        try {
            request.send();
        } catch ( error ) {
            if ( onprogress !== undefined && onprogress !== null ) {
                onprogress( 0 );
            }
            reject( new Error( error + ': ' + request.status ) );
            timer && window.clearTimeout( timer ); timer = null;
        }
    }
    );
}

/**
 * Stops downlink bandwidth measurement.
 */
function stopDlBw() {
    if ( request !== null ) {
        request.onprogress = null;
        request.abort();
    }
    timer && window.clearTimeout( timer ); timer = null;
    request = null;
}

export { getDlBw, stopDlBw };
