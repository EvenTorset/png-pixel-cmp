use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = comparePngPixels)]
pub fn compare_png_pixels_js(a: &[u8], b: &[u8]) -> Result<bool, JsValue> {
  crate::compare_png_pixels(a, b).map_err(|e| {
    let error = js_sys::Error::new(&e.message);
    error.set_name("PngCompareError");
    let value: JsValue = error.into();
    let _ = js_sys::Reflect::set(
      &value,
      &JsValue::from_str("kind"),
      &JsValue::from_str(e.kind.as_str()),
    );
    value
  })
}
