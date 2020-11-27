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
import { log } from './modules/logger.js';
import { isValidHttpUrl } from './modules/utils.js';
import {
    LppNetworkTracer,
    LppStatus
} from './modules/nettrace.js';

function onConnectionChange() {
    const { type, effectiveType } = navigator.connection;
    if ( typeof type !== 'undefined' ) {
        while ( network.firstChild ) {
            network.removeChild( network.firstChild );
        }
        if ( typeof effectiveType !== 'undefined' ) {
            network.appendChild( document.createTextNode(
                `Network: ${type} (Effective connection ` +
                `type: ${effectiveType})` ) );
        } else {
            network.appendChild( document.createTextNode(
                `Network: ${type}` ) );
        }
    } else {
        while ( network.firstChild ) {
            network.removeChild( network.firstChild );
        }
        if ( typeof effectiveType !== 'undefined' ) {
            network.appendChild( document.createTextNode(
                `Network: Effective connection type: ` +
                `${effectiveType}` ) );
        } else {
            network.appendChild( document.createTextNode(
                `Network: unknown` ) );
        }
    }
    animate( network );
}

function initValues() {
    description.value = 'Trip from A to B';
    dlBwTestInterval.value = 10;
    dlBwTestDuration.value = 10;
    dlLimitKbytes.value = 2048;
    fileUrl.disabled = false;
    fileUrl.value = '';
    tracePosition.disabled = false;
    tracePosition.checked = false;
    startButton.disabled = false;
    pauseButton.disabled = true;
    pauseButton.innerText = pauseButton.textContent = "Pause";
    stopButton.disabled = true;
    copyButton.disabled = true;
    outputJson.value = '';
    updateProgressBar( 0 );
}

function switchInputFields( enable ) {
    if ( enable === true ) {
        description.disabled = false;
        clientModel.disabled = false;
        clientName.disabled = false;
        note.disabled = false;
        dlBwTestInterval.disabled = false;
        dlBwTestDuration.disabled = false;
        dlLimitKbytes.disabled = false;
        fileUrl.disabled = false;
        tracePosition.disabled = false;
    } else {
        description.disabled = true;
        clientModel.disabled = true;
        clientName.disabled = true;
        note.disabled = true;
        dlBwTestInterval.disabled = true;
        dlBwTestDuration.disabled = true;
        dlLimitKbytes.disabled = true;
        fileUrl.disabled = true;
        tracePosition.disabled = true;
    }
}

function animate( element ) {
    element.style.backgroundColor = "#f2f2f2";
    setTimeout( function () {
        element.style.backgroundColor= "#ffffff";
    }, 1000 );
}

function lppStart() {
    var params = {
        traceDlBw: true,
        dlBwTestInterval: dlBwTestInterval.value
    };
    if ( tracePosition.checked === true ) {
        params.tracePosition = true;
    }
    params.dlBwTestDuration = dlBwTestDuration.value;
    params.dlLimitKbytes = dlLimitKbytes.value;
    if ( clientModel.value !== "" ) {
        params.clientModel = clientModel.value;
    }
    if ( clientName.value !== "" ) {
        params.clientName = clientName.value;
    }
    if ( note.value !== "" ) {
        params.note = note.value;
    }
    params.url = fileUrl.value;
    params.onDlBwProgress = function ( percentage ) {
        updateProgressBar( percentage );
    };
    sampler = new LppNetworkTracer( 1, description.value, params );
    sampler.setDlBwResultHdlr( function () {
        while ( status.firstChild ) {
            status.removeChild( status.firstChild );
        }
        status.appendChild( document.createTextNode(
            'Status: running...' ) );
        animate( status );

        const bw = sampler.getDlBw();
        if ( bw !== null ) {
            updateProgressBar( 100 );
            while ( bandwidth.firstChild ) {
                bandwidth.removeChild( bandwidth.firstChild );
            }
            bandwidth.appendChild( document.createTextNode(
                'Measured DL BW: ' + bw + ' kbps' ) );
            animate( bandwidth );
        }
        const pos = sampler.getPosition();
        while ( position.firstChild ) {
            position.removeChild( position.firstChild );
        }
        if ( pos !== null ) {
            position.appendChild(
                document.createTextNode( "Position:" ) );
            var lineBreak = document.createElement( "br" );
            position.appendChild( lineBreak );
            position.appendChild( document.createTextNode(
                "- latitude: " + pos.getLatitude() ) );
            var lineBreak = document.createElement( "br" );
            position.appendChild( lineBreak );
            position.appendChild( document.createTextNode(
                "- longitude: " + pos.getLongitude() ) );
            var lineBreak = document.createElement( "br" );
            position.appendChild( lineBreak );
            position.appendChild( document.createTextNode(
                "- accuracy: " + pos.getAccuracy() ) );
            animate( position );
        } else {
            position.appendChild(
                document.createTextNode( "Position: " ) );
            if ( sampler.getPositionError() !== null ) {
                position.appendChild( document.createTextNode(
                    sampler.getPositionError() ) );
            }
        }
    } );
    sampler.setErrorHdlr( function () {
        const err = sampler.getError();
        if ( err !== null ) {
            while ( status.firstChild ) {
                status.removeChild( status.firstChild );
            }
            status.appendChild( document.createTextNode(
                'Error: ' + err ) );
            animate( status );
        }
        const bw = sampler.getDlBw();
        if ( bw !== null ) {
            if ( bw === 0 ) {
                updateProgressBar( 0 );
            } else {
                updateProgressBar( 100 );
            }
            while ( bandwidth.firstChild ) {
                bandwidth.removeChild( bandwidth.firstChild );
            }
            bandwidth.appendChild( document.createTextNode(
                'Measured DL BW: ' + bw + ' kbps' ) );
            animate( bandwidth );
        }
        const pos = sampler.getPosition();
        while ( position.firstChild ) {
            position.removeChild( position.firstChild );
        }
        if ( pos !== null ) {
            position.appendChild(
                document.createTextNode( "Position:" ) );
            var lineBreak = document.createElement( "br" );
            position.appendChild( lineBreak );
            position.appendChild( document.createTextNode(
                "- latitude: " + pos.getLatitude() ) );
            var lineBreak = document.createElement( "br" );
            position.appendChild( lineBreak );
            position.appendChild( document.createTextNode(
                "- longitude: " + pos.getLongitude() ) );
            var lineBreak = document.createElement( "br" );
            position.appendChild( lineBreak );
            position.appendChild( document.createTextNode(
                "- accuracy: " + pos.getAccuracy() ) );
            animate( position );
        } else {
            position.appendChild(
                document.createTextNode( "Position: " ) );
            if ( sampler.getPositionError() !== null ) {
                position.appendChild( document.createTextNode(
                    sampler.getPositionError() ) );
            }
        }
    } );
    sampler.start();
}

function onStopButtonClick() {
    switchInputFields( true );
    stopButton.disabled = true;
    startButton.disabled = false;
    pauseButton.disabled = true;
    copyButton.disabled = false;
    pauseButton.innerText = pauseButton.textContent = "Pause";
    sampler.stop();
    while ( status.firstChild ) {
        status.removeChild( status.firstChild );
    }
    status.appendChild( document.createTextNode( "Status: stopped" ) );
    animate( status );
    outputJson.value = sampler.toJSON();
}

function isEmpty( field ) {
    const value = field.value;

    if ( value.length === 0 || value === '' ) {
        return true;
    }
    return false;
}

function validateDescription() {
    if ( isEmpty( description ) ) {
        alert( 'Description must not be empty!' );
        return false;
    }
    return true;
}

function validateDlBwTestInterval() {
    if ( isEmpty( dlBwTestInterval ) ||
        !Number.isInteger( Number( dlBwTestInterval.value ) ) ||
        Number( dlBwTestInterval.value ) <= 0 ) {
        alert( 'interval must be positive integer!' );
        return false;
    }
    return true;
}

function validateDlBwTestDuration() {
    if ( isEmpty( dlBwTestDuration ) ||
        !Number.isInteger( Number( dlBwTestDuration.value ) ) ||
        Number( dlBwTestDuration.value ) <= 0 ) {
        alert( 'duration must be positive integer!' );
        return false;
    }
    if ( Number( dlBwTestDuration.value ) > 
        Number( dlBwTestInterval.value ) ) {
        alert( 'duration must be <= interval!' );
        return false;
    }
    return true;
}

function validateDlLimitKbytes() {
    if ( isEmpty( dlLimitKbytes ) ||
        !Number.isInteger( Number( dlLimitKbytes.value ) ) ||
        Number( dlLimitKbytes.value ) <= 0 ) {
        alert( 'limit must be positive integer!' );
        return false;
    }
    return true;
}

function validateUrl() {
    if ( !isEmpty( fileUrl ) && !isValidHttpUrl( fileUrl.value ) ) {
        alert( 'url is invalid!' );
        return false;
    }
    return true;
}

function onTracePositionClick() {
    if ( tracePosition.checked === true ) {
        if ( navigator.geolocation ) {
            navigator.geolocation.getCurrentPosition( () => {} );
        }
    }
}

function onStartButtonClick() {
    if ( validateDescription() === false ) {
        return;
    }
    if ( validateDlBwTestInterval() === false ) {
        return;
    }
    if ( validateDlBwTestDuration() === false ) {
        return;
    }
    if ( validateDlLimitKbytes() === false ) {
        return;
    }
    if ( validateUrl() === false ) {
        return; 
    }
    outputJson.value = '';
    switchInputFields( false );
    while ( bandwidth.firstChild ) {
        bandwidth.removeChild( bandwidth.firstChild );
    }
    bandwidth.appendChild(
        document.createTextNode( 'Measured DL BW: ' ) );
    while ( position.firstChild ) {
        position.removeChild( position.firstChild );
    }
    position.appendChild(
        document.createTextNode( "Position:" ) );
    while ( status.firstChild ) {
        status.removeChild( status.firstChild );
    }
    status.appendChild(
        document.createTextNode( "Status: running..." ) );
    lppStart();
    startButton.disabled = true;
    pauseButton.disabled = false;
    stopButton.disabled = false;
    copyButton.disabled = true;
    updateProgressBar( 0 );
}

function onPauseButtonClick() {
    if ( sampler !== null && pauseButton.disabled === false ) {
        while ( status.firstChild ) {
            status.removeChild( status.firstChild );
        }
        if ( sampler.getStatus() === LppStatus.STARTED ) {
            sampler.stop();
            status.appendChild( document.createTextNode(
                "Status: paused" ) );
            pauseButton.innerText = pauseButton.textContent = "Resume";
            animate( status );
        } else if ( sampler.getStatus() === LppStatus.STOPPED ) {
            status.appendChild( document.createTextNode(
                "Status: running..." ) );
            sampler.start();
            pauseButton.innerText = pauseButton.textContent = "Pause";
            animate( status );
        }
    }
}

function onCopyButtonClick() {
    outputJson.select();
    outputJson.setSelectionRange( 0, outputJson.value.length );
    document.execCommand( "copy" );
    outputJson.setSelectionRange( 0, 0 );
    outputJson.disabled = true;
    alert( 'JSON copied to clipboard' );
    outputJson.disabled = false;
}

function updateProgressBar( percentage ) {
    if ( percentage <= 100 ) {
        bar.style.width = percentage + "%";
        while ( percent.firstChild ) {
            percent.removeChild( percent.firstChild );
        }
        percent.appendChild( document.createTextNode( percentage + '%' ) );
    }
}

function isMobile() {
    let ret = false;
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test( navigator.userAgent ) ){
        ret = true;
    }
    return ret;
}

var description = document.getElementById( 'description' );
var clientModel = document.getElementById( 'clientModel' );
var clientName = document.getElementById( 'clientName' );
var note = document.getElementById( 'note' );
var dlBwTestInterval = document.getElementById( 'dlBwTestInterval' );
var dlBwTestDuration = document.getElementById( 'dlBwTestDuration' );
var dlLimitKbytes = document.getElementById( 'dlLimitKbytes' );
var fileUrl = document.getElementById( 'fileUrl' );
var startButton = document.getElementById( 'startButton' );
var pauseButton = document.getElementById( 'pauseButton' );
var stopButton = document.getElementById( 'stopButton' );
var copyButton  = document.getElementById( 'copyButton' );
var jsonLink = document.getElementById( 'jsonLink' );
var status = document.getElementById( 'status' );
var bandwidth = document.getElementById( 'bandwidth' );
var network = document.getElementById( 'network' );
var position = document.getElementById( 'position' );
var sampler = null;
var outputJson = document.getElementById( 'outputJson' );
var percent = document.getElementById( 'percent' );
var bar = document.getElementById( 'bar' );
var tracePosition = document.getElementById( 'tracePosition' );

initValues();

tracePosition.onclick = onTracePositionClick;
startButton.onclick = onStartButtonClick;
pauseButton.onclick = onPauseButtonClick;
stopButton.onclick = onStopButtonClick;
copyButton.onclick = onCopyButtonClick;

if ( navigator.connection ) {
    while ( network.firstChild ) {
        network.removeChild( network.firstChild );
    }
    if ( typeof navigator.connection.type !== 'undefined' ) {
        if ( typeof navigator.connection.effectiveType !== 'undefined' ) {
            network.appendChild( document.createTextNode(
                `Network: ${navigator.connection.type} ` +
                `(Effective connection type: ` +
                `${navigator.connection.effectiveType})` ) );
        } else {
            network.appendChild( document.createTextNode(
                `Network: ${navigator.connection.type}` ) );
        }
    } else {
        if ( typeof navigator.connection.effectiveType !== 'undefined' ) {
            network.appendChild( document.createTextNode(
                `Network: Effective connection type: ` +
                `${navigator.connection.effectiveType}` ) );
        } else {
            network.appendChild( document.createTextNode(
                `Network: unknown` ) );
        }
    }
    animate( network );
    navigator.connection.addEventListener( 'change', onConnectionChange );
} else {
    while ( network.firstChild ) {
        network.removeChild( network.firstChild );
    }
    network.appendChild( document.createTextNode( `Network: unknown` ) );
}

window.onerror = function ( msg, url, lineNo, columnNo, error ) {
    var string = msg.toLowerCase();
    var substring = 'script error';
    if ( string.indexOf( substring ) > -1 ) {
        log( 'err', 'Script Error: See Browser Console for Detail' );
    } else {
        var message = [
            'Message: ' + msg,
            'URL: ' + url,
            'Line: ' + lineNo,
            'Column: ' + columnNo,
            'Error object: ' + JSON.stringify( error )
        ].join( ' - ' );

        log( 'err', message );
    }

    return false;
};

if ( isMobile() ) {
    window.document.addEventListener( "visibilitychange", function ( e ) {
        onPauseButtonClick();
    } );
}
