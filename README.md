# Link Performance Prediction (LPP) and Network Trace Tools

Network Trace Tools is toolkit that facilitates application development and testing by allowing capture and emulation of relevant network characteristics. In addition to the tools, a trace library and a file format specification is provided.

The main deliverables are the:
 
1. Network Trace Capture
2. Network Trace Emulator
3. Standard Trace Library 
4. Trace File Format

[W3C TPAC 2020 Video](https://www.w3.org/2020/10/TPAC/wn-lpp.html)

#### 1. Network Trace Capture
The Network Trace Capture tool is a website that allows you to capture a trace of the current network conditions. Captured traces are compatible with the emulation tool. There are a selection of parameters that can be set in order to fine tune the network tracing. Optionally, it is possible to trace the UE location as well.

#### 2. Network Trace Emulator
With collected/available traces it is possible to emulate the experienced network conditions using the Network Trace Emulator. The emulator is  implemented as a chrome extension and is applied on preferred tab. It also features forward looking predictions of the network through a `javascript` API, which e.g. a webapp can leverage to improve network performance. This feature illustrates how LPP can be utilized to improve the performance and utilization of the network.

#### 3. Standard Trace Library
As a complement to privately collected traces, a standard trace library is provided to enable emulation of network conditions from different parts of the world.

#### 4. Trace File Format
In addition to the above, a trace file format is provided. The intent is to have flexible and extensible format that contains series of bandwidth and (optionally) location data.

