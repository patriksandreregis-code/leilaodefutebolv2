// Pacote "Brasileirão 2026" do leilão. Formato: C('Clube', { CARGO: `Nome nota, Nome nota` }).
// Cargos: GOL, ZAG, LD, LE, VOL, MC, MEI, PE, PD, CA. Notas aproximadas (0-100).
// ATENÇÃO: lista montada de memória + notícias; as janelas de transferência mudam os elencos. REVISE e complete à vontade:
// para atualizar, basta editar/adicionar linhas abaixo (ou me enviar o texto do elenco copiado do site da CBF/ge que eu converto).
const BROAD = { GOL: 'GK', ZAG: 'DEF', LD: 'DEF', LE: 'DEF', VOL: 'MID', MC: 'MID', MEI: 'MID', PE: 'ATT', PD: 'ATT', CA: 'ATT' };
const out = [];
function C(club, o) {
  for (const [role, s] of Object.entries(o)) for (const x of s.split(',')) {
    const w = x.trim().split(/\s+/), r = +w.pop(); out.push([w.join(' '), BROAD[role], r, 'B', club, role]);
  }
}
C('Flamengo', { GOL: `Rossi 82`, ZAG: `Léo Ortiz 85, Léo Pereira 82, Danilo 80, Vitão 78`, LD: `Varela 78`, LE: `Alex Sandro 78, Ayrton Lucas 79`, VOL: `Pulgar 78, Jorginho 76`, MC: `De La Cruz 82, Carrascal 79`, MEI: `Arrascaeta 86, Paquetá 83`, PD: `Plata 80`, PE: `Samuel Lino 81, Luiz Araújo 79`, CA: `Pedro 83` });
C('Palmeiras', { GOL: `Weverton 80`, ZAG: `Gustavo Gómez 81, Murilo 80, Bruno Fuchs 77`, LD: `Giay 77`, LE: `Piquerez 81`, VOL: `Marlon Freitas 78, Allan 77`, MEI: `Andreas Pereira 80`, PD: `Facundo Torres 78, Jhon Arias 77`, PE: `Paulinho 79, Maurício 77`, CA: `Vitor Roque 81, Flaco López 79` });
C('Fluminense', { GOL: `Fábio 76`, ZAG: `Thiago Silva 80, Freytes 74, Ignácio 74`, LD: `Samuel Xavier 74`, LE: `Renê 74`, VOL: `Martinelli 76, Hércules 74`, MC: `Nonato 74`, MEI: `Ganso 76`, PE: `Kevin Serna 74, Canobbio 75`, CA: `Cano 78, John Kennedy 76` });
C('Bahia', { GOL: `Ronaldo 76, Marcos Felipe 76`, ZAG: `David Duarte 75, Kanu 74, Gabriel Xavier 74`, LD: `Gilberto 76`, LE: `Luciano Juba 78`, VOL: `Acevedo 76, Jean Lucas 75`, MC: `Michel Araújo 76`, MEI: `Everton Ribeiro 78, Cauly 78`, PD: `Erick Pulga 75, Ramos Mingo 74`, PE: `Ademir 75`, CA: `Everaldo 75, Biel (BAH) 74` });
C('Cruzeiro', { GOL: `Cássio 78`, ZAG: `Fabrício Bruno 78, Jonathan Jesus 75, Villalba 74`, LD: `William 76`, LE: `Kaiki Bruno 75`, VOL: `Lucas Romero 75, Lucas Silva 75`, MC: `Matheus Henrique 77, Christian (CRU) 75`, MEI: `Matheus Pereira 82`, PE: `Wanderson 76`, PD: `Gabigol 78`, CA: `Kaio Jorge 79` });
C('Atlético-MG', { GOL: `Everson 76`, ZAG: `Lyanco 78, Jemmes 74`, LD: `Natanael 75`, LE: `Arana 80`, VOL: `Alan Franco 77`, MC: `Zaracho 77, Igor Gomes 74`, MEI: `Scarpa 79, Hulk 82`, PD: `Biel (CAM) 74`, PE: `Rony 77`, CA: `Alisson (CAM) 74` });
C('Corinthians', { GOL: `Hugo Souza 76`, ZAG: `Félix Torres 76, Gustavo Henrique 75, André Ramalho 75, Cacá 74`, LD: `Matheuzinho (COR) 76`, LE: `Matheus Bidu 75`, VOL: `Raniele 76, Breno Bidon 77`, MC: `Alex Santana 74`, MEI: `Garro 80, Memphis Depay 83`, PD: `Maycon 74`, PE: `Talles Magno 75`, CA: `Yuri Alberto 80, Héctor Hernández 75` });
C('São Paulo', { GOL: `Rafael 76`, ZAG: `Arboleda 78, Ferraresi 75, Sabino 74`, LD: `Cédric 76`, LE: `Wendell 76`, VOL: `Marcos Antônio 75, Pablo Maia 75`, MC: `Alisson (SPFC) 75`, MEI: `Oscar 79, Ryan Francisco 76`, PD: `Lucas Moura 77`, PE: `Wellington Rato 75`, CA: `Calleri 79, Luciano 78` });
C('Botafogo', { GOL: `John 77`, ZAG: `Barboza 78, Bastos 76, Jair 75`, LD: `Vitinho (BOT) 77, Mateo Ponte 74`, LE: `Cuiabano 75`, VOL: `Gregore 77, Danilo Barbosa 75`, MEI: `Savarino 78, Artur 77`, PD: `Matheus Martins 77`, CA: `Arthur Cabral 76` });
C('Santos', { GOL: `Gabriel Brazão 75`, ZAG: `Luisão 74, Gil 74`, LD: `Igor Vinícius 74`, LE: `Souza 73`, VOL: `João Schmidt 76`, MC: `Rollheiser 76`, MEI: `Neymar 80, Thaciano 74`, PE: `Soteldo 76`, PD: `Barreal 74`, CA: `Guilherme 74, Deivid Washington 73` });
C('Grêmio', { GOL: `Tiago Volpi 76`, ZAG: `Kannemann 78, Jemerson 74, Viery 74`, LD: `João Pedro 74`, LE: `Marlon 73`, VOL: `Villasanti 78, Edenilson 76`, MEI: `Cristaldo 76, Carballo 76`, PE: `Aravena 77`, PD: `Alysson 74, Monsalve 74`, CA: `Braithwaite 76, Amuzu 74` });
C('Vasco', { GOL: `Léo Jardim 77`, ZAG: `Robert Renan 77, João Victor 75`, LD: `Paulo Henrique 76`, LE: `Lucas Piton 77`, VOL: `Hugo Moura 74, Barros 74`, MEI: `Philippe Coutinho 80`, MC: `Tchê Tchê 74`, PE: `Rayan 77`, PD: `Nuno Moreira 75`, CA: `Vegetti 79, Andrés Gómez 74` });
C('Internacional', { GOL: `Rochet 78`, ZAG: `Clayton Sampaio 74, Victor Gabriel 73`, LD: `Mercado 74`, LE: `Bernabei 75`, VOL: `Bruno Henrique 74, Thiago Maia 74`, MEI: `Alan Patrick 78`, PD: `Vitinho (INT) 75`, PE: `Wesley 74`, CA: `Enner Valencia 77, Borré 77` });
C('Red Bull Bragantino', { GOL: `Cleiton 75`, ZAG: `Pedro Henrique 74, Eduardo Santos 74`, LE: `Juninho Capixaba 76`, VOL: `Jhon Jhon 76, Eric Ramires 74`, MEI: `Lucas Evangelista 76`, PE: `Henry Mosquera 75`, PD: `Lucas Barbosa 75`, CA: `Eduardo Sasha 76, Isidro Pitta 75` });
C('Athletico-PR', { GOL: `Santos 76`, ZAG: `Gamarra 76`, LD: `Léo Godoy 74`, LE: `Esquivel 74`, VOL: `Fernandinho 74, Christian (CAP) 74`, MEI: `Zapelli 76`, PE: `Cuello 76`, CA: `Mastriani 75, Viveros 75` });
C('Vitória', { GOL: `Lucas Arcanjo 75`, ZAG: `Wagner Leonardo 75, Camutanga 74`, LD: `Raúl Cáceres 73`, LE: `Zeca 72`, VOL: `Caíque 73`, MEI: `Matheuzinho (VIT) 74`, PE: `Osvaldo 74`, CA: `Renato Kayzer 74` });
C('Mirassol', { GOL: `Walter 76`, LD: `Lucas Ramon 72`, LE: `Reinaldo 72`, VOL: `Neto Moura 72, Danielzinho 72`, MEI: `Shaylon 72`, PD: `Nathan Fogaça 72`, PE: `Negueba 72`, CA: `Chico da Costa 72` });
C('Coritiba', { GOL: `Pedro Rangel 72`, MEI: `Lucas Ronier 73`, PE: `Alef Manga 75`, PD: `Pedro Rocha 73`, VOL: `Josué 73` });
C('Remo', { GOL: `Marcelo Rangel 72` });
C('Chapecoense', { GOL: `Léo Vieira 70`, CA: `Perotti 70` });
module.exports = out;
