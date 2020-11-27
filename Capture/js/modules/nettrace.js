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
import { getDlBw, stopDlBw } from './speedtest.js';
import { precondition, assert, ucs2length, isFunction } from './utils.js';

Date.prototype.toIsoString = function () {
    var tzo = -this.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function ( n, width ) {
            width = width || 2;
            n = Math.abs( Math.floor( n ) ) + '';
            return n.length >= width ?
                n : 
                new Array( width - n.length + 1 ).join( '0' ) + n;
        };
    return this.getFullYear() +
        '-' + pad( this.getMonth() + 1 ) +
        '-' + pad( this.getDate() ) +
        'T' + pad( this.getHours() ) +
        ':' + pad( this.getMinutes() ) +
        ':' + pad( this.getSeconds() ) +
        '.' + pad( this.getMilliseconds(), 3 ) + 
        dif + pad( tzo / 60 ) +
        ':' + pad( tzo % 60 );
};

const Defaults = Object.freeze( {
    dlBwTestInterval: 10, // seconds
    dlBwTestDuration: 10, // seconds
    dlLimitKbytes: 2048, // kilobytes
    descriptionMaxLength: 256,
    clientModelMaxLength: 128,
    clientNameMaxLength: 128,
    networkMaxLength: 128,
    noteMaxLength: 512,
    getPositionTimeout: 30 * 1000, // millis
    locationPermPromptTimeout: 120 * 1000 // millis
} );

/**
 * Type describing tracing status.
 */
const LppStatus = Object.freeze( {
    NOT_STARTED: 0,
    STARTED: 1,
    STOPPED: 2,
    FAILED: 3
} );

class Trace {
    /*
     * Constructor.
     *
     * @param {number} version - schema version
     * @param {string} description - trace description
     * @param {string} clientModel - client model
     * @param {string} clientName - client name
     * @param {string} note - additional description
     */
    constructor( version, description, clientModel, clientName, note ) {
        assert( version === 1, 'version != 1' );
        assert( description !== null, 'description=null' );
        assert( typeof description === 'string', 'description is not string' );
        this.version = version;
        this.description = description;
        if ( typeof clientModel !== 'undefined' && clientModel !== null ) {
            assert( typeof clientModel === 'string',
                'clientModel is not string' );
            this.clientModel = clientModel;
        }
        if ( typeof clientName !== 'undefined' && clientName !== null ) {
            assert( typeof clientName === 'string',
                'clientName is not string' );
            this.clientName = clientName;
        }
        if ( typeof note !== 'undefined' && note !== null ) {
            assert( typeof note === 'string', 'note is not string' );
            this.note = note;
        }
        this.entries = [];
    }
}

/**
 * Class describing GPS position (latitude, longitude, accuracy in meters).
 */
class Position {
    /**
     * Constructor.
     *
     * @param {double} latitude
     * @param {double} longitude
     * @param {number} accuracy
     */
    constructor( latitude, longitude, accuracy ) {
        precondition( latitude !== null, 'latitude=null' );
        precondition( longitude !== null, 'longitude=null' );
        precondition( !isNaN( latitude ), 'latitude is not a number' );
        precondition( !isNaN( longitude ), 'longitude is not a number' );
        precondition( accuracy !== null && !isNaN( accuracy ),
            'accuracy is not a number' );
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
    }

    /**
     * Returns a double representing the position's latitude in decimal degress.
     */
    getLatitude() {
        return this.latitude;
    }

    /**
     * Returns a double representing the position's longitude in decimal degress.
     */
    getLongitude() {
        return this.longitude;
    }

    /**
     * Returns a double representing the accuracy of the latitude and longitude
     * properties, expressed in meters OR null if not available.
     */
    getAccuracy() {
        return this.accuracy;
    }
}

/**
 * Class used for handling position changes.
 */
class PositionHandler {
    /**
     * Constructor.
     */
    constructor() {
        this.error = null;
        this.position = null;
        this.watchPositionId = null;
        this.timer = null;
    }

    /**
     * @return {Promise} resolve => instance of Position class OR
     * null (if not available)
     */
    getPosition() {
        this.error = null;

        let watchPosition = function () {
            var showPosition = function ( position ) {
                const pos = new Position( position.coords.latitude,
                    position.coords.longitude, position.coords.accuracy );
                log( 'debug', 'got new position: ' + pos.getLatitude() + ' ' +
                    pos.getLongitude() + ' (acc: ' + pos.getAccuracy() + ')',
                'PositionHandler::showPosition' );
                this.position = pos;
            };

            var errorPosition = function ( error ) {
                let e;
                switch ( error.code ) {
                case 1: e = 'PERMISSION_DENIED'; break;
                case 2: e = 'POSITION_UNAVAILABLE'; break;
                case 3: e = 'TIMEOUT'; break;
                default: e = 'unknown'; break;
                }
                this.error = 'failed to get position: error: ' + e;
                this.position = null;
                log( 'err', 'failed to get position: error: ' + e,
                    'PositionHandler::errorPosition' );
            };

            const options = { enableHighAccuracy: true,
                timeout: Defaults.getPositionTimeout };

            if ( navigator.geolocation ) {
                this.watchPositionId = navigator.geolocation.watchPosition(
                    showPosition.bind( this ), errorPosition.bind( this ),
                    options );
                log( 'debug', 'watchPositionId: ' + this.watchPositionId,
                    'PositionHandler::watchPosition' );
            } else {
                this.error = 'geolocation not supported';
                this.position = null;
                log( 'warn', 'geo not supported',
                    'PositionHandler::watchPosition' );
            }
        }.bind( this );

        let queryGeoLocationPermission = function () {
            return new Promise( function ( resolve, reject ) {
                if ( navigator.permissions ) {
                    log( 'debug', 'navigator.permissions exists',
                        'PositionHandler::queryGeoLocationPermission' );
                    navigator.permissions.query( { name: 'geolocation' } )
                        .then( function ( permissionStatus ) {
                            log( 'debug', 'geolocation permission state is: ' +
                                permissionStatus.state,
                            'PositionHandler::queryGeoLocationPermission' );
                            resolve( permissionStatus.state );
                        } );
                } else {
                    reject( new Error( 'permissions not supported' ) );
                }
            } );
        };

        let getCurrentPosition = function () {
            return new Promise( function ( resolve ) {

                var showPosition = function ( position ) {
                    const pos = new Position( position.coords.latitude,
                        position.coords.longitude, position.coords.accuracy );
                    this.position = pos;
                    resolve( pos );
                };

                var errorPosition = function ( error ) {
                    let e;
                    switch ( error.code ) {
                    case 1: e = 'PERMISSION_DENIED'; break;
                    case 2: e = 'POSITION_UNAVAILABLE'; break;
                    case 3: e = 'TIMEOUT'; break;
                    default: e = 'unknown'; break;
                    }
                    this.error = 'failed to get geolocation: error: ' + e;
                    this.position = null;
                    log( 'err', 'failed to get geolocation: error: ' + e,
                        'PositionHandler::errorPosition' );
                    resolve( null );
                };

                const options = { enableHighAccuracy: true,
                    timeout: Defaults.getPositionTimeout };

                if ( navigator.geolocation ) {
                    navigator.geolocation.getCurrentPosition(
                        showPosition.bind( this ), errorPosition.bind( this ),
                        options );
                } else {
                    this.error = 'geolocation not supported';
                    this.position = null;
                    log( 'warn', 'geo not supported',
                        'PositionHandler::getCurrentPosition' );
                    resolve( null );
                }
            }.bind( this ) );
        }.bind( this );

        return new Promise( async function ( resolve ) {
            this.timer = window.setTimeout( function () {
                log( 'err', 'position not available (timed out)',
                    'PositionHandler::getCurrentPosition' );
                resolve( null );
            }, Defaults.locationPermPromptTimeout );

            try {
                const permState = await queryGeoLocationPermission();
                if ( permState === 'granted' ) {
                    if ( this.watchPositionId !== null &&
                        this.position !== null ) {
                        clearTimeout( this.timer );
                        // return last received position
                        log( 'info', 'position: ' + this.position.getLatitude() +
                            ' ' + this.position.getLongitude() + ' (acc: ' +
                            this.position.getAccuracy() + ')',
                        'PositionHandler::getPosition' );
                        resolve( this.position );
                        return;
                    }

                    if ( this.watchPositionId === null ) {
                        log( 'debug', 'start watching position changes',
                            'PositionHandler::getPosition' );
                        watchPosition();
                    }

                    const pos = await getCurrentPosition();
                    clearTimeout( this.timer );
                    if ( pos !== null ) {
                        log( 'info', 'position: ' + pos.getLatitude() + ' ' +
                            pos.getLongitude() + ' (acc: ' +
                            pos.getAccuracy() + ')',
                        'PositionHandler::getPosition' );
                    } else {
                        log( 'err', 'position not available',
                            'PositionHandler::getCurrentPosition' );
                    }
                    resolve( pos );
                } else if ( permState === 'denied' ) {
                    this.position = null;
                    if ( this.watchPositionId !== null ) {
                        log( 'debug', 'stop watching position changes',
                            'PositionHandler::getPosition' );
                        navigator.geolocation.clearWatch( this.watchPositionId );
                        this.watchPositionId = null;
                    }

                    clearTimeout( this.timer );
                    log( 'err', 'position not available',
                        'PositionHandler::getCurrentPosition' );
                    resolve( null );
                } else if ( permState === 'prompt' ) {
                    this.position = null;
                    if ( this.watchPositionId !== null ) {
                        log( 'debug', 'stop watching position changes',
                            'PositionHandler::getPosition' );
                        navigator.geolocation.clearWatch( this.watchPositionId );
                        this.watchPositionId = null;
                    }

                    const pos = await getCurrentPosition();
                    clearTimeout( this.timer );
                    if ( pos !== null ) {
                        log( 'info', 'position: ' + pos.getLatitude() + ' ' +
                            pos.getLongitude() + ' (acc: ' + pos.getAccuracy() +
                            ')', 'PositionHandler::getPosition' );
                    } else {
                        log( 'err', 'position not available',
                            'PositionHandler::getCurrentPosition' );
                    }
                    resolve( pos );
                }
            } catch ( error ) {
                const pos = await getCurrentPosition();
                clearTimeout( this.timer );
                if ( pos !== null ) {
                    log( 'info', 'position: ' + pos.getLatitude() + ' ' +
                        pos.getLongitude() + ' (acc: ' + pos.getAccuracy() + ')',
                    'PositionHandler::getPosition' );
                } else {
                    log( 'err', 'position not available',
                        'PositionHandler::getCurrentPosition' );
                }
                resolve( pos );
            }
        }.bind( this ) );
    }

    /**
     * Stop watching position changes, clear internal timer, clear position.
     */
    stopPosition() {
        if ( this.timer !== null ) {
            clearTimeout( this.timer );
            this.timer = null;
        }
        if ( this.watchPositionId !== null ) {
            log( 'debug', 'stop watching position changes',
                'PositionHandler::stopPosition' );
            navigator.geolocation.clearWatch( this.watchPositionId );
            this.watchPositionId = null;
        }
        this.position = null;
        this.error = null;
    }

    /**
     * @return {string} last error message OR null.
     */
    getError() {
        return this.error;
    }
}

class TraceEntry {
    /*
     * Constructor.
     *
     * @param {number} entryNo - entry number in ascending order
     * @param {string} dateTime - UTC timestamp in format “YYYY-MM-DDThh:mm:ssTZD” 
     * according to ISO 8601
     * @param {Object} opt - object containing optional fields:
     *      - {integer} ulBw - uplink bandwidth in kbps
     *      - {integer} ulLatency - uplink latency in microseconds
     *      - {integer} dlBw - downlink bandwidth in kbps
     *      - {integer} dlLatency - downlink latency in microseconds
     *      - {Object} position - object containing GPS position (latitude,
     *      longitude, accuracy)
     *      - {string} network - network operator name or the numeric name 
     *      (MCC+MNC) or network type
     *      - {string} note - additional description
     */
    constructor( entryNo, dateTime, opt ) {
        assert( entryNo !== null, 'entryNo=null' );
        assert( dateTime !== null, 'dateTime=null' );
        assert( Number.isInteger( +entryNo ), 'entryNo is not an integer' );
        assert( typeof dateTime === 'string', 'dateTime is not string' );
        this.entryNo = entryNo;
        this.dateTime = dateTime;
        let options;
        if ( opt !== null && typeof opt === 'object' ) {
            options = opt;
        } else {
            options = {};
        }
        if ( options.dlBw !== undefined ) {
            assert( Number.isInteger( +options.dlBw ),
                'dlBw is not an integer' );
            this.dlBw = options.dlBw;
        }
        if ( options.dlLatency !== undefined ) {
            assert( Number.isInteger( +options.dlLatency ),
                'dlLatency is not an integer' );
            this.dlLatency = options.dlLatency;
        }
        if ( options.ulBw !== undefined ) {
            assert( Number.isInteger( +options.ulBw ),
                'ulBw is not an integer' );
            this.ulBw = options.ulBw;
        }
        if ( options.ulLatency !== undefined ) {
            assert( Number.isInteger( +options.ulLatency ),
                'ulLatency is not an integer' );
            this.ulLatency = options.ulLatency;
        }
        if ( options.position !== undefined && options.position !== null ) {
            this.gpsCoordinates = options.position;
        }
        if ( options.note !== undefined ) {
            assert( typeof options.note === 'string', 'note is not a string' );
            assert( ucs2length( options.note ) <= Defaults.noteMaxLength,
                'note is longer than ' + Defaults.noteMaxLength );
            this.note = options.note;
        }
        if ( options.network !== undefined ) {
            assert( typeof options.network === 'string',
                'network is not a string' );
            assert( ucs2length( options.network ) <= Defaults.networkMaxLength,
                'network is longer than ' + Defaults.networkMaxLength );
            this.network = options.network;
        }
    }
}

class Tracer {
    /*
     * Constructor.
     *
     * @param {number} schemaVersion - JSON schema version
     * @param {string} description - trace description
     * @param {string} clientModel - client model
     * @param {string} clientName - client name
     * @param {string} note - additional description
     */
    constructor( schemaVersion, description, clientModel, clientName, note ) {
        this.entries = 0;
        this.dump = new Trace( schemaVersion, description, clientModel,
            clientName, note );
    }

    trace( opt ) {
        let options;

        if ( typeof opt === 'object' ) {
            options = opt;
        } else {
            options = {};
        }

        const dateTime = new Date().toIsoString();
        this.entries++;
        if ( navigator.connection ) {
            const type = navigator.connection.type;
            const eff = navigator.connection.effectiveType;
            if ( typeof type !== 'undefined' ) {
                if ( typeof eff !== 'undefined' ) {
                    options.network = type + ' (Effective connection type: ' +
                        eff + ')';
                } else {
                    options.network = type;
                }
            } else {
                if ( typeof eff !== 'undefined' ) {
                    options.network = 'Effective connection type: ' + eff;
                }
            }
        }
        const tmp = new TraceEntry( this.entries, dateTime, options );
        this.dump.entries.push( tmp );
    }

    getEntryCount() {
        return this.entries;
    }

    toJSON() {
        return JSON.stringify( this.dump, null, '\t' );
    }
}

/**
 * Class providing tracing possibility.
 * One can trace downlink bandwidth, gps position.
 */
class LppNetworkTracer {
    /**
     * Constructor.
     *
     * @param {number} schemaVersion - JSON schema version
     * @param {string} description - trace description (e.g. 'from Stockholm to
     * Szczecin')
     * @param {object} options - object containing optional parameters:<br>
     *      {boolean} traceDlBw - enable/disable tracing downlink bandwidth,<br>
     *      {boolean} tracePosition - enable/disable tracing gps position,<br>
     *      {number} dlBwTestDuration - downlink bandwidth test maximum duration
     *      in seconds,<br>
     *      {number} dlBwTestInterval - downlink bandwidth test interval
     *      in seconds,<br>
     *      {string} clientModel - client model (e.g. 'SM-G390'),<br>
     *      {string} clientName - client name (e.g. 'Samsung'),<br>
     *      {string} note - additional description,<br>
     *      {string} url - http(s) URL that is downloaded for downlink bandwidth
     *      measurement,<br>
     *      {number} dlLimitKbytes - download limit (in kilobytes). Each
     *      measurement will stop after this amount is downloaded.
     *      {Function} onDlBwProgress - function that is called (at least once)
     *      with percentage of download
     */
    constructor( schemaVersion, description, options ) {
        precondition( schemaVersion !== null, 'schemaVersion=null' );
        precondition( schemaVersion === 1, 'schemaVersion != 1' );
        precondition( description !== null, 'description=null' );
        precondition( typeof description === 'string',
            'description is not a string' );
        precondition( ucs2length( description ) <= Defaults.descriptionMaxLength,
            'description is longer than ' + Defaults.descriptionMaxLength );
        precondition( options !== null, 'options=null' );
        precondition( typeof options === 'object', 'options is not an object' );
        var _schemaVersion = schemaVersion;
        this.getSchemaVersion = function () { return _schemaVersion; };
        var _description = description;
        this.getDescription = function () { return _description; };
        var _traceDlBw;
        if ( options.traceDlBw !== undefined ) {
            precondition( typeof options.traceDlBw === 'boolean',
                'traceDlBw is not a boolean' );
            _traceDlBw = options.traceDlBw;
        } else {
            _traceDlBw = false;
        }
        this.getTraceDlBw = function () { return _traceDlBw; };
        var _tracePosition;
        if ( options.tracePosition !== undefined ) {
            precondition( typeof options.tracePosition === 'boolean',
                'tracePosition is not a boolean' );
            _tracePosition = options.tracePosition;
        } else {
            _tracePosition = false;
        }
        this.getTracePosition = function () { return _tracePosition; };
        precondition( this.getTracePosition() === true ||
            this.getTraceDlBw() === true, 'tracing not enabled' );
        var _dlBwTestDuration;
        if ( options.dlBwTestDuration !== undefined ) {
            precondition( Number.isInteger( +options.dlBwTestDuration ),
                'dlBwTestDuration is not an integer' );
            precondition( +options.dlBwTestDuration > 0,
                'dlBwTestDuration <= 0' );
            _dlBwTestDuration = options.dlBwTestDuration;
        } else {
            _dlBwTestDuration = Defaults.dlBwTestDuration;
        }
        this.getDlBwTestDuration = function () {
            return _dlBwTestDuration;
        };
        var _dlBwTestInterval;
        if ( options.dlBwTestInterval !== undefined ) {
            precondition( Number.isInteger( +options.dlBwTestInterval ),
                'dlBwTestInterval is not an integer' );
            precondition( +options.dlBwTestInterval > 0,
                'dlBwTestInterval is not positive' );
            precondition( this.getDlBwTestDuration() <= +options.dlBwTestInterval,
                'dlBwTestDuration > dlBwTestInterval' );
            _dlBwTestInterval = options.dlBwTestInterval;
        } else {
            _dlBwTestInterval = Defaults.dlBwTestInterval;
        }
        this.getDlBwTestInterval = function () { return _dlBwTestInterval; };
        var _clientModel;
        if ( options.clientModel !== undefined ) {
            precondition( typeof options.clientModel === 'string',
                'clientModel is not a string' );
            precondition( ucs2length( options.clientModel ) <=
                Defaults.clientModelMaxLength,
            'clientModel is longer than ' + Defaults.clientModelMaxLength );
            _clientModel = options.clientModel;
        } else {
            _clientModel = null;
        }
        this.getClientModel = function () { return _clientModel; };
        var _clientName;
        if ( options.clientName !== undefined ) {
            precondition( typeof options.clientName === 'string',
                'clientName is not a string' );
            precondition( ucs2length( options.clientName ) <=
                Defaults.clientNameMaxLength,
            'clientName is longer than ' + Defaults.clientNameMaxLength );
            _clientName = options.clientName;
        } else {
            _clientName = null;
        }
        this.getClientName = function () { return _clientName; };
        var _note;
        if ( options.note !== undefined ) {
            precondition( typeof options.note === 'string',
                'note is not a string' );
            precondition( ucs2length( options.note ) <= Defaults.noteMaxLength,
                'note is longer than ' + Defaults.noteMaxLength );
            _note = options.note;
        } else {
            _note = null;
        }
        this.getNote = function () { return _note; };
        precondition( options.url !== undefined, 'url=undefined' );
        precondition( options.url !== null, 'url=null' );
        precondition( typeof options.url === 'string', 'url is not a string' );
        var _url = options.url;
        this.getUrl = function () { return _url; };
        var _dlLimitKbytes;
        if ( options.dlLimitKbytes !== undefined ) {
            precondition( Number.isInteger( +options.dlLimitKbytes ),
                'dlLimitKbytes is not an integer' );
            precondition( +options.dlLimitKbytes > 0, 'dlLimitKbytes <= 0' );
            _dlLimitKbytes = options.dlLimitKbytes;
        } else {
            _dlLimitKbytes = Defaults.dlLimitKbytes;
        }
        this.getDlLimitKbytes = function () {
            return _dlLimitKbytes;
        };
        var _position = null;
        this.getPosition = function () { return _position; };
        this.setPosition = function ( val ) {
            precondition( val === null || val instanceof Position,
                'pos is not an instance of '
            + 'Position class' );
            _position = val;
        };
        var _positionHandler = new PositionHandler();
        this.getPositionHandler = function () { return _positionHandler; };
        var _positionError = null;
        this.getPositionError = function () { return _positionError; };
        this.setPositionError = function ( val ) {
            precondition( val === null || typeof val === 'string',
                'argument is a string' );
            _positionError = val;
        };
        var _status = LppStatus.NOT_STARTED;
        this.getStatus = function () { return _status; };
        this.setStatus = function ( st ) {
            let valid = false;
            const values = Object.values( LppStatus );
            for ( const val of values ) {
                if ( st === val ) {
                    valid = true;
                    break;
                }
            }
            precondition( valid, 'st should be one of LppStatus values' );
            _status = st;
        };
        var _errorHdlr = null;
        this.setErrorHdlr = function ( hdlr ) {
            precondition( hdlr === null || isFunction( hdlr ),
                'hdlr is not a function' );
            _errorHdlr = hdlr;
        };
        this.getErrorHdlr = function () { return _errorHdlr; };
        var _dlBwResultHdlr = null;
        this.setDlBwResultHdlr = function ( hdlr ) {
            precondition( hdlr === null || isFunction( hdlr ),
                'hdlr is not a function' );
            _dlBwResultHdlr = hdlr;
        };
        this.getDlBwResultHdlr = function () { return _dlBwResultHdlr; };
        var _dlBw = null;
        this.setDlBw = function ( val ) {
            precondition( Number.isInteger( +val ), 'val is not an integer' );
            _dlBw = val;
        };
        this.getDlBw = function () { return _dlBw; };
        var _error = null;
        this.setError = function ( err ) {
            precondition( err === null || typeof err === 'string',
                'err is not a string' );
            _error = err;
        };
        this.getError = function () { return _error; };
        var _dlBwTestRunning = false;
        this.setDlBwTestRunning = function ( run ) {
            precondition( typeof run === 'boolean', 'run is not a boolean' );
            _dlBwTestRunning = run;
        };
        this.getDlBwTestRunning = function () { return _dlBwTestRunning; };
        var _tracer = null;
        this.getTracer = function () { return _tracer; };
        this.setTracer = function ( tr ) {
            precondition( tr === null || tr instanceof Tracer,
                'tr is not an instance of Tracer class' );
            _tracer = tr;
        };
        var _dlBwTimer = null;
        this.getDlBwTimer = function () { return _dlBwTimer; };
        this.setDlBwTimer = function ( t ) {
            _dlBwTimer = t;
        };
        var _onDlBwProgress;
        if ( options.onDlBwProgress !== undefined &&
            options.onDlBwProgress !== null ) {
            precondition( isFunction( options.onDlBwProgress ),
                'onDlBwProgress is not a function' );
            _onDlBwProgress = options.onDlBwProgress;
        } else {
            _onDlBwProgress = null;
        }
        this.getOnDlBwProgress = _onDlBwProgress;
    }

    /**
     * Start tracing.
     */
    start() {
        var getDlBwPrv = async function () {
            let bw;
            try {
                bw = getDlBw( this.getDlLimitKbytes(),
                    this.getDlBwTestDuration(), this.getUrl(),
                    this.getOnDlBwProgress );
                this.setDlBwTestRunning( true );
                bw.then(
                    async resultBw => {
                        this.setDlBw( resultBw );
                        if ( this.getTracePosition() === true ) {
                            try {
                                const pos = await
                                this.getPositionHandler().getPosition();
                                this.getTracer().trace( {
                                    position: pos,
                                    dlBw: resultBw
                                } );
                                this.setPositionError(
                                    this.getPositionHandler().getError() );
                                this.setPosition( pos );
                            } catch ( error ) {
                                this.getTracer().trace( {
                                    dlBw: resultBw
                                } );
                                this.setPosition( null );
                                this.setPositionError(
                                    this.getPositionHandler().getError() );
                            }
                        } else {
                            this.getTracer().trace( {
                                dlBw: resultBw
                            } );
                        }

                        if ( this.getDlBwResultHdlr() ) {
                            this.getDlBwResultHdlr()();
                        }
                        this.setDlBwTestRunning( false );
                    },
                    async error => {
                        this.setError( error.message );
                        this.setDlBw( 0 );
                        if ( this.getTracePosition() === true ) {
                            try {
                                const pos = await
                                this.getPositionHandler().getPosition();
                                this.getTracer().trace( {
                                    position: pos,
                                    dlBw: 0
                                } );
                                this.setPositionError(
                                    this.getPositionHandler().getError() );
                                this.setPosition( pos );
                            } catch ( error ) {
                                this.getTracer().trace( { dlBw: 0 } );
                                this.setPosition( null );
                                this.setPositionError(
                                    this.getPositionHandler().getError() );
                            }
                        } else {
                            this.getTracer().trace( { dlBw: 0 } );
                        }
                        if ( this.getErrorHdlr() ) {
                            this.getErrorHdlr()();
                        }

                        this.setDlBwTestRunning( false );
                    }
                );
            } catch ( error ) {
                log( 'err', error.message,
                    'LppNetworkTracer::start::getDlBwPrv' );
                this.setError( error.message );
                if ( this.getErrorHdlr() ) {
                    this.getErrorHdlr()();
                }
            }
        };

        if ( this.getStatus() === LppStatus.STARTED ) {
            log( 'warn', 'already started', 'LppNetworkTracer::start' );
            return;
        }
        if ( this.getTracer() === null ) {
            this.setTracer( new Tracer( this.getSchemaVersion(),
                this.getDescription(), this.getClientModel(),
                this.getClientName(), this.getNote() ) );
        }
        if ( this.getTracePosition() === true ) {
            this.setError( null );
        }
        this.setStatus( LppStatus.STARTED );
        log( 'info', 'started sampling', 'LppNetworkTracer::start' );
        if ( this.getTraceDlBw() === true ) {
            var getDlBwPrvBound = getDlBwPrv.bind( this );
            var intervalFunctionBound = function () {
                if ( this.getDlBwTestRunning() === false ) {
                    getDlBwPrvBound();
                }
            }.bind( this );

            getDlBwPrvBound();
            this.setDlBwTimer( setInterval( function () {
                intervalFunctionBound();
            }, this.getDlBwTestInterval() * 1000 ) );
        }
    }

    /**
     * Stop tracing.
     */
    stop() {
        if ( this.getTraceDlBw() === true ) {
            stopDlBw();
            if ( this.getDlBwTimer() !== null ) {
                clearInterval( this.getDlBwTimer() );
                this.setDlBwTimer( null );
            }
        }
        if ( this.getTracePosition() === true ) {
            this.getPositionHandler().stopPosition();
        }
        if ( this.getStatus() === LppStatus.STOPPED ) {
            log( 'warn', 'already stopped', 'LppNetworkTracer::stop' );
            return;
        } else if ( this.getStatus() !== LppStatus.STARTED ) {
            log( 'warn', 'not started', 'LppNetworkTracer::stop' );
            return;
        }

        this.setStatus( LppStatus.STOPPED );
        log( 'info', 'stopped sampling', 'LppNetworkTracer::stop' );
    }

    /**
     * @return {number} number of trace entries.
     */
    getEntryCount() {
        if ( this.getTracer() !== null ) {
            return this.getTracer().getEntryCount();
        } else {
            return 0;
        }
    }

    /**
     * @return {string} JSON trace string.
     */
    toJSON() {
        if ( this.getTracer() !== null ) {
            return this.getTracer().toJSON();
        } else {
            return null;
        }
    }
}

export {
    LppNetworkTracer,
    Position,
    LppStatus
};
