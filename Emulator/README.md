# Network Trace Emulator



Description
-----------
- Chrome development tool extension enabling emulation of network conditions (downlink) based on pre-recorded trace files.

- Enables a simple way to test web applications when put through different network conditions.

- The emulator showcases that leveraging LPP predictions can enhance your web application.

Installation
-----------

See [INSTALL.md](INSTALL.md)

LPP predicions - LPP JS API
-----------
Network Trace Emulator also provides LPP Java Script API that provides data about future predicted network conditions.  
It can be used by a  web application to test different network scenarios and adjust it based on predicted data.

1. Create LppSession object.
```javascript
Constructor
LppSession(LppPredictionOptions options)

LppPredictionOptions = {
    Boolean downlinkBandwidth; Boolean uplinkBandwidth;
    Boolean latency;  
    Number maxPredictions;}
```
e.g.

```javascript
lpp = new LppSession({ downlinkBandwidth: true, maxPredictions: 10 });	
```

2. Subscribe to LPP Service
```javascript
LppSession.start()
```
e.g.
```javascript
lpp.start();	
```
3. Receive LPP predictions

Handler for lpp event fired when data is received from LPP service connection.

```javascript
LppSession.onpredictions (data)

```
The data message will contain an array of predictions. There can be several predictions of different types at one specific point in time. The predictions are always in chronological order with the nearest prediction first in the array


Received message structure:
```javascript
data = {
    predictions: [
        {
            time: <Number>,
	       type: <lppType>,
            value: <Number>,
            variation: <Number>,
            probability: <Number>
        }, {...}, ... ]};
```
* time: Number of sec since midnight 1 January 1970.
* type: LPP predcition type 
* value: Number or String depending on prediction type
* variaton: Standard deviation of the predicition
* probability: Statistical probability of the prediction


LppType 

```javascript
LppType.type == PREDICTION_TYPE_DOWNLINK_BANDWIDTH  //value is a number of kilobits per second
LppType.type == PREDICTION_TYPE_UPLINK_BANDWIDTH  // value is a number of kilobits per second
LppType.type == PREDICTION_TYPE_LATENCY // value is a number of nanoseconds
```

Full example:

```javascript
lpp = new LppSession({ downlinkBandwidth: true, maxPredictions: 10 });	
lpp.start();
	lpp.onpredictions = (event) => {
  		alert(JSON.stringify(event.predictions))	
          }
```
Chromium Issues
-----------

1. [Issue 1126825](https://bugs.chromium.org/p/chromium/issues/detail?id=1126825) To avoid issues in certain use cases e.g. using the extension on youtube, please remove the corresponding website application under `chrome://apps`. The issue will be patched in later releases of the chromium engine. 
2. [Issue 423246](https://bugs.chromium.org/p/chromium/issues/detail?id=423246) Emulation cannot be provided with the extension using the `WebSocket` protocol. 





