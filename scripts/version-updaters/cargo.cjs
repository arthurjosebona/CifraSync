// Atualizador de versão do commit-and-tag-version para o Cargo.toml do app desktop.
const RE = /^version\s*=\s*"([^"]+)"/m;

module.exports.readVersion = (contents) => contents.match(RE)?.[1];
module.exports.writeVersion = (contents, version) => contents.replace(RE, `version = "${version}"`);
