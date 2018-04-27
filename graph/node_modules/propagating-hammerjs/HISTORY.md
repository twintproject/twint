# History

## 2016-03-05, version 1.4.6

- Fixed #6: stopPropagation not binding to the original event.


## 2016-01-13, version 1.4.5

- Made `propagating-hammerjs` more robust against removing/attaching a DOM
  element in the DOM whilst executing a touch event of the DOM element itself.


## 2016-01-04, version 1.4.4

- Upgraded to Hammer.js v2.0.6. 
  - Replaced usage of `Hammer.extend` with `Hammer.assign`.
- Fixed not working in case of multiple instances of propagating-hammerjs on 
  the same DOM element. Thanks @jsdw.


## 2015-06-04, version 1.4.3

- Fixed `dragend` events not being emitted correctly in case of multiple
  nested handlers.

  
## 2015-06-02, version 1.4.2

- Fixed not being able to overload options when having overridden the global 
  Hammer instance.
  

## 2015-04-20, version 1.4.1

- Fixed not being able to handle both a tap and double tap.


## 2015-04-17, version 1.4.0

- Extended the option `preventDefault` with values `'mouse'`, `'touch'`, 
  and `'pen'` to prevent default behavior for a specific type of device.


## 2015-04-14, version 1.3.0

- Created an option `preventDefault` to enforce preventing the default browser
  behavior.
- Fixed propagation not being handled correctly when the mouse pointer is
  being dragged outside the parent div.


## 2015-02-09, version 1.2.2

- Fixed #2, the `emit` method not working.


## 2015-01-29, version 1.2.1

- Removed using top level `this`, attaching `propagating` immediately to
  `window instead`.


## 2015-01-05, version 1.2.0

- Added an event property `event.firstTarget`, always containing the element
  where a gesture started.
- Fixed the `hammer.input` event blocking the emit of real events.
- Fixed `panend` not being emitted when `pan` was used too.


## 2015-01-02, version 1.1.1

- Fixed the module not working via commonjs.


## 2014-12-30, version 1.1.0

- Added support for applying `propagating` to the Hammer constructor.


## 2014-12-30, version 1.0.0

- Initial, fully functional release.
