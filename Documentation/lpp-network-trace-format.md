# LPP Network Trace Format

This document describes the format of Link Performance Prediction (LPP) network
trace file, aka ntrace file. The intent is to have flexible and extensible
format that contains series of location and bandwidth data. This documentation
along with network emulator and trace capture tools as well as traces can be
found under GNU GPL 2.0 license at [lpp-network-trace](https://github.com/intel/lpp-network-trace).

## Trace format

The trace file is based on a JSON structure with a header and a payload.

Link to [JSON schema](https://github.com/intel/lpp-network-trace/blob/main/Documentation/ntrace.schema).

### Trace header

| Name                  | Type    | Description                            | Mandatory |
|:----------------------|:-------:|:---------------------------------------|:---------:|
| version               | integer | Format version<br>(possible values: 1) | yes       |
| description           | string  | Trace description (e.g. “From Stockholm to Szczecin”)<br>(min length: 1, max length: 256) | yes |
| clientModel           | string  | Client model (e.g. “SM-G390”)<br>(max length: 128) | no |
| clientName            | string  | Client name (e.g. “Samsung Galaxy S10”)<br>(max length: 128) | no |
| note                  | string  | additional description, e.g. name of network, link test server<br>(max length: 512) | no |
| dlBwTestDuration      | integer | Configured downlink bandwidth test max duration in seconds<br>(minimum value: 1) | no |
| dlBwTestDownloadLimit | integer | Configured download limit in kilobytes<br>(minimum value: 1) | no |
| dlBwTestUrl           | string  | Configured URL to download<br>(max length: 2048) | no |
| ulBwTestDuration      | integer | Configured uplink bandwidth test max duration in seconds<br>(minimum value: 1) | no |
| ulBwTestUploadLimit   | integer | Configured upload limit in kilobytes<br>(minimum value: 1) | no |

### Entry

| Name          | Type    | Description                            | Mandatory |
|:------------- |:-------:|:---------------------------------------|:---------:|
| entryNo       | integer | Trace entry number in ascending order <br>(minimum value: 1) | yes |
| dateTime      | string  | UTC timestamp in format “YYYY-MM-DDThh:mm:ssTZD”<br>according to ISO 8601<br>(e.g. 1997-07-16T19:20:30+01:00, 1997-07-16T19:20:30Z) | yes |
| network       | string  | Network operator name or the numeric name (MCC+MNC)<br>(max length: 128) | no |
| dlBw          | integer | Downlink bandwidth in kpbs             | no        |
| dlLatency     | integer | Downlink latency to first bytes in microseconds | no |
| ulBw	        | integer |	Uplink bandwidth in kpbs               | no        |
| ulLatency     | integer |	Uplink latency to first bytes in microseconds |	no |
| latitude<br>longitude<br>accuracy | double<br>double<br>double | GPS latitude, longitude in decimal degrees (DD) in WGS-84 format,<br>accuracy in meters | no |
| note          | string  | Additional description<br>(max length: 512) | no |

*Note 1:* minimum number of entries is 2<br>
*Note 2:* entryNo – value must be ascending for subsequent entries<br>
*Note 3:* dateTime – must be greater for subsequent entries

### JSON file examples

```json
{
  "clientModel": "SM-G390",
  "note": "additional description",
  "dlBwTestDuration": 10,
  "version": 1,
  "description": "trip from Paris to London",
  "entries": [
    {
      "entryNo": 1,
      "dateTime": "2012-04-23T18:25:43.511Z",
      "ulBw": 3000
    },
    {
      "entryNo": 2,
      "dateTime": "2012-04-23T18:27:00.000Z",
      "ulBw": 25000
    }
  ]
}
```

```json
{
  "version": 1,
  "description": "trip from Szczecin to Warsaw",
  "clientModel": "SM-G390",
  "clientName": "Samsung Galaxy",
  "note": "some more info",
  "entries": [
    {
      "entryNo": 1,
      "dateTime": "2012-04-23T18:25:43.511Z",
      "network": "Plus",
      "gpsCoordinates": {
        "latitude": 48.858264489795047,
        "longitude": 2.2945318624928879,
        "accuracy": 10
      },
      "note": "park"
    },
    {
      "entryNo": 2,
      "dateTime": "2012-04-23T18:30:43.511Z",
      "network": "Plus",
      "dlBw": 45000,
      "dlLatency": 20,
      "ulBw": 2500,
      "ulLatency": 0,
      "note": "subway station 1"
    },
    {
      "entryNo": 3,
      "dateTime": "2012-04-23T20:30:43.511Z",
      "network": "Plus",
      "dlBw": 3000,
      "note": "subway station 2"
    }
  ]
}
```
