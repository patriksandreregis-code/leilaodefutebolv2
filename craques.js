// Base de craques do LEILÃO (separada do Dado da Copa). Formato: "Nome nota época" — época: A = atual, L = lenda.
// Para adicionar um craque, é só incluir na posição certa. Notas aproximadas (0-100).
const RAW = {
  GK: `Yashin 95 L, Buffon 94 L, Casillas 93 L, Kahn 92 L, Zoff 91 L, Schmeichel 90 L, Taffarel 87 L, Dida 87 L,
    Courtois 90 A, Donnarumma 89 A, Alisson 88 A, Maignan 88 A, Neuer 88 A, Oblak 87 A, Emiliano Martínez 87 A, Kobel 86 A, Ter Stegen 85 A, Raya 85 A`,
  DEF: `Beckenbauer 96 L, Maldini 95 L, Baresi 94 L, Cannavaro 92 L, Nilton Santos 92 L, Cafu 91 L, Roberto Carlos 91 L, Nesta 91 L, Dani Alves 91 L, Lahm 91 L, Bobby Moore 91 L, Sergio Ramos 91 L,
    Puyol 90 L, Desailly 90 L, Chiellini 90 L, Carlos Alberto 90 L, Marcelo 89 L, Piqué 89 L, Ferdinand 89 L, Kompany 89 L, Lúcio 88 L, Zanetti 88 L, Thuram 88 L, Terry 88 L, Pepe 88 L, Thiago Silva 88 L,
    Van Dijk 90 A, Rúben Dias 89 A, Saliba 89 A, Marquinhos 88 A, Hakimi 88 A, Gabriel 88 A, Nuno Mendes 87 A, Bastoni 87 A, Rüdiger 86 A, Trent Alexander-Arnold 86 A, Koundé 86 A, Gvardiol 86 A, Romero 86 A, Theo Hernández 85 A, Araújo 85 A, Akanji 85 A`,
  MID: `Zidane 96 L, Platini 95 L, Zico 94 L, Matthäus 93 L, Iniesta 93 L, Xavi 93 L, Bobby Charlton 93 L, Gullit 92 L, Pirlo 91 L, Kaká 91 L, Rijkaard 91 L, Figo 91 L, Sócrates 91 L, Rivellino 91 L, Kroos 91 L,
    Modrić 90 L, Gerrard 90 L, Scholes 90 L, Nedvěd 90 L, Lampard 89 L, Vieira 89 L, Busquets 88 L,
    Rodri 91 A, Bellingham 90 A, Valverde 89 A, Pedri 89 A, De Bruyne 88 A, Vitinha 88 A, Bernardo Silva 88 A, Bruno Fernandes 88 A, Ødegaard 88 A, Wirtz 88 A, Kimmich 88 A, Rice 88 A, João Neves 87 A, Barella 87 A, Mac Allister 86 A, Tchouaméni 86 A, Caicedo 86 A, Enzo Fernández 85 A`,
  ATT: `Pelé 99 L, Maradona 98 L, Ronaldo Fenômeno 97 L, Cruyff 97 L, Puskás 97 L, Di Stéfano 96 L, Eusébio 95 L, Garrincha 95 L, Van Basten 95 L, Gerd Müller 95 L, Ronaldinho 94 L, Romário 93 L, Henry 93 L, Baggio 93 L, Rivaldo 92 L,
    Ibrahimović 91 L, Batistuta 91 L, Shevchenko 91 L, Raúl 90 L, Eto'o 90 L, Suárez 90 L, Agüero 89 L,
    Mbappé 94 A, Messi 93 A, Haaland 93 A, Cristiano Ronaldo 91 A, Yamal 91 A, Kane 91 A, Vinícius Jr 90 A, Lewandowski 90 A, Benzema 90 A, Dembélé 89 A, Musiala 89 A, Salah 89 A, Raphinha 88 A, Lautaro Martínez 88 A, Neymar 88 A,
    Isak 87 A, Gyökeres 87 A, Saka 87 A, Son 86 A, Olise 86 A, Osimhen 86 A, Yıldız 85 A`,
};
const POOL = Object.entries(RAW).flatMap(([pos, s]) => s.split(',').map(x => {
  const w = x.trim().split(/\s+/), era = w.pop(), r = +w.pop();
  return [w.join(' '), pos, r, era];
}));
if (new Set(POOL.map(x => x[0])).size !== POOL.length) console.warn('Craque repetido na base!');
module.exports = POOL;
