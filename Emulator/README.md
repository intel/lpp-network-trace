# Network Trace Extension



Description
-----------
Chrome development tool extension able to emulate network conditions (downlink, uplink, latency) according to pre-recorded JSON file.

Simple way to test a web application with different network conditions.

Using LPP predictions can enhance your web application.

JSON schema for files
-----------

ADD LINKS

LPP predicions - LPP JS API
-----------
1. Create LppSession object.
```javascript
Constructor
LppSession(LppPredictionOptions options)

LppPredictionOptions = {
    Boolean downlinkBandwidth; Boolean uplinkBandwidth;
    Boolean latency;  
    Number maxPredictions;}

```
2. Subscribe to LPP Service
```javascript
LppSession.start()

```
3. Receive LPP predictions

Handler for lpp event fired when data is received from LPP service connection. 

```javascript
LppSession.onpredictions (data)

```
The data message will contain an array of predictions. 
There can be several predictions of different types at one specific time.
The predictions are always in chronlogical order with the nearest prdiction first in the array

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
* time: Number of ms since midnight 1 January 1970.
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








