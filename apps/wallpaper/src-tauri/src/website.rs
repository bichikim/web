use serde::Deserialize;

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Customization {
    #[serde(default)]
    css: String,
    #[serde(default)]
    script: String,
    #[serde(default)]
    script_start: String,
    #[serde(default)]
    script_dom: String,
}

pub(crate) fn initialization_script(
    code: &Customization,
    local_origin: Option<String>,
) -> Result<String, serde_json::Error> {
    let local_origin = serde_json::to_string(&local_origin)?;
    let css = serde_json::to_string(&code.css)?;
    let bootstrap = include_str!("website/bootstrap.js");
    Ok(format!(
        "{bootstrap}\ninstallWebsiteCode({{localOrigin: {local_origin}, css: {css}, start: () => {{\n{}\n}}, dom: () => {{\n{}\n}}, loaded: () => {{\n{}\n}}}});",
        code.script_start, code.script_dom, code.script
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn css_is_encoded_as_data_and_legacy_script_runs_in_the_load_slot() {
        let code = Customization {
            css: "body::after { content: '\"</script>'; }\nbody { color: red; }".into(),
            script: "window.finished = true;".into(),
            ..Customization::default()
        };
        let script = initialization_script(&code, None).unwrap();
        assert!(script.contains(&format!(
            "css: {},",
            serde_json::to_string(&code.css).unwrap()
        )));
        assert!(script.ends_with("loaded: () => {\nwindow.finished = true;\n}});"));
    }
}
