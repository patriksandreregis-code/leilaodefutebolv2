// =====================================================================
// Base de elencos do "Dado da Copa" e da página /selecoes. TODOS os elencos ficam neste arquivo.
// Para adicionar: copie uma linha S(...) e edite. Notas aproximadas (0-100).
// Cada elenco precisa de pelo menos 1 GK, 4 DEF, 3 MID e 3 ATT.
// Elencos repetidos (mesma seleção + mesmo ano) são ignorados e avisados no console.
// =====================================================================
const SQUADS = [];
function S(t, y, o) {
  if (SQUADS.some(s => s.t === t && s.y === y)) { console.warn("Elenco repetido ignorado:", t, y); return; }
  SQUADS.push({ t, y, p: Object.entries(o).flatMap(([pos, s]) => s.split(",").map(x => { x = x.trim(); const i = x.lastIndexOf(" "); return [x.slice(0, i), pos, +x.slice(i + 1)]; })) });
}

// ===== Copa 2026 =====
S('África do Sul',2026,{GK:`Ronwen Williams 80`,DEF:`Modiba 72, Mudau 72, Sibisi 70, Okon 70, Mbokazi 68`,MID:`Mokoena 74, Sithole 70, Mbatha 68, Adams 68`,ATT:`Zwane 72, Foster 72, Appollis 70, Mofokeng 70, Rayners 68`});
S('Alemanha',2026,{GK:`Neuer 86`,DEF:`Rüdiger 86, Tah 84, Schlotterbeck 82, Raum 78, Thiaw 78, Anton 78`,MID:`Kimmich 88, Pavlović 80, Goretzka 80, Groß 76, Nmecha 76`,ATT:`Musiala 89, Wirtz 88, Havertz 84, Sané 84, Woltemade 80, Undav 76`});
S('Arábia Saudita',2026,{GK:`Al-Owais 72`,DEF:`Abdulhamid 72, Al-Amri 70, Tambakti 70, Lajami 68, Majrashi 68`,MID:`S. Al-Dawsari 76, Kanno 72, N. Al-Dawsari 72, Al-Khaibari 70`,ATT:`Al-Buraikan 72, Al-Shehri 70, Al-Hamdan 68`});
S('Argélia',2026,{GK:`Luca Zidane 72`,DEF:`Aït-Nouri 80, Bensebaini 76, Mandi 74, Hadjam 70, Belghali 68`,MID:`Aouar 76, Maza 76, Chaïbi 74, Bentaleb 72, Zerrouki 72, Boudaoui 72`,ATT:`Mahrez 82, Amoura 78, Gouiri 78, Hadj Moussa 74`});
S('Argentina',2026,{GK:`E. Martínez 86`,DEF:`Romero 86, Lisandro Martínez 84, Molina 80, Otamendi 78, Tagliafico 76, Balerdi 76`,MID:`Mac Allister 86, Enzo Fernández 85, De Paul 82, Paredes 78, Palacios 78, Lo Celso 78`,ATT:`Messi 90, Lautaro Martínez 89, J. Álvarez 86, N. González 80, Almada 78`});
S('Austrália',2026,{GK:`Ryan 72`,DEF:`Circati 74, Souttar 72, Burgess 70, Degenek 70, Behich 70`,MID:`Irvine 74, Metcalfe 72, Hrustić 72, O'Neill 66`,ATT:`Irankunda 74, Leckie 70, Volpato 70, Touré 68`});
S('Áustria',2026,{GK:`Alexander Schlager 74`,DEF:`Alaba 80, Danso 78, Posch 76, Lienhart 74, Mwene 74, Prass 74`,MID:`Laimer 82, Sabitzer 80, Baumgartner 80, Seiwald 78, Xaver Schlager 76`,ATT:`Arnautović 76, Gregoritsch 74, Kalajdžić 72, Chukwuemeka 74`});
S('Bélgica',2026,{GK:`Courtois 89`,DEF:`Debast 78, Castagne 76, De Winter 74, Theate 74, Meunier 74, De Cuyper 74`,MID:`De Bruyne 87, Onana 82, Tielemans 82, Raskin 74, Witsel 74`,ATT:`Lukaku 82, Doku 82, Trossard 82, De Ketelaere 80, Saelemaekers 76`});
S('Bósnia',2026,{GK:`Vasilj 74`,DEF:`Kolašinac 76, Dedić 74, Katić 72, Muharemović 72, Mujakić 70`,MID:`Sunjić 72, Hadžiahmetović 72, Bašić 70, Tahirović 70, Bajraktarević 74`,ATT:`Džeko 76, Demirović 78, Tabaković 72, Alajbegović 72`});
S('Brasil',2026,{GK:`Alisson 87`,DEF:`Marquinhos 87, Gabriel 87, Bremer 84, Wesley 78, Danilo 76, Alex Sandro 74`,MID:`Bruno Guimarães 85, Casemiro 82, Paquetá 82, Fabinho 76`,ATT:`Vinícius Jr 90, Raphinha 89, Cunha 84, Endrick 80, Martinelli 80, Neymar 80`});
S('Cabo Verde',2026,{GK:`Vozinha 70`,DEF:`Logan Costa 70, Roberto Lopes 68, Stopira 66, Diney 66, Moreira 66`,MID:`Monteiro 70, Kevin Pina 68, D. Duarte 66, Arcanjo 64`,ATT:`Ryan Mendes 66, Garry Rodrigues 66, Jovane Cabral 66, Willy Semedo 64`});
S('Canadá',2026,{GK:`St Clair 72`,DEF:`Davies 84, Johnston 74, Bombito 74, Cornelius 70, Laryea 72`,MID:`Eustáquio 78, Koné 76, Osorio 70, Saliba 70`,ATT:`Jonathan David 84, Buchanan 76, Larin 74, Shaffelburg 72, Oluwaseyi 72`});
S('Catar',2026,{GK:`Barsham 70`,DEF:`Khoukhi 68, Pedro Miguel 70, Al-Brake 66, Lucas Mendes 68, Hussein 66`,MID:`Boudiaf 70, Hatem 68, Madibo 66, Fathi 66`,ATT:`Afif 74, Almoez Ali 72, Al-Haydos 68, Edmilson Junior 68`});
S('Colômbia',2026,{GK:`Ospina 74`,DEF:`Lucumí 78, D. Muñoz 78, Dávinson Sánchez 76, Mojica 74, Mina 72`,MID:`James Rodríguez 80, Jhon Arias 78, Ríos 78, Lerma 76, Carrascal 74, Quintero 72`,ATT:`Luis Díaz 88, Luis Suárez 76, J. Córdoba 72, J. C. Hernández 70`});
S('Coreia do Sul',2026,{GK:`Jo Hyeon-woo 74`,DEF:`Kim Min-jae 85, Seol Young-woo 74, Kim Moon-hwan 72, Lee Han-beom 72, Lee Tae-seok 70`,MID:`Lee Kang-in 82, Hwang In-beom 78, Lee Jae-sung 76, Paik Seung-ho 72`,ATT:`Son 86, Hwang Hee-chan 78, Cho Gue-sung 74, Oh Hyeon-gyu 72`});
S('Costa do Marfim',2026,{GK:`Lafont 76`,DEF:`Singo 78, Ndicka 78, Diomandé 76, Kossounou 76, Agbadou 74`,MID:`Kessié 78, Sangaré 78, Fofana 76, Seri 66`,ATT:`Amad Diallo 82, Yan Diomande 80, Pépé 76, Adingra 76, Guessand 74, Bonny 74`});
S('Croácia',2026,{GK:`Livaković 78`,DEF:`Gvardiol 86, Šutalo 76, Stanišić 76, Pongračić 76, Ćaleta-Car 74`,MID:`Modrić 84, Kovačić 82, M. Pašalić 80, Sučić 78, Vlašić 78, Baturina 74`,ATT:`Perišić 78, Kramarić 78, Budimir 76, Musa 70`});
S('Curaçao',2026,{GK:`Room 68`,DEF:`Obispo 70, Bazoer 68, Brenet 66, Sambo 66, Floranus 64`,MID:`Leandro Bacuna 70, Juninho Bacuna 68, Noslin 62, Roemeratoe 62`,ATT:`Chong 72, Hansen 68, Locadia 68, Gorré 66`});
S('Egito',2026,{GK:`El Shenawy 74`,DEF:`Hany 70, Abdelmaguid 70, Ibrahim 70, Rabia 70, Hafez 68`,MID:`Trezeguet 76, Zizo 72, Ashour 72, Lasheen 68, Adel 68`,ATT:`Salah 89, Marmoush 84, Hamza Abdelkarim 72`});
S('Equador',2026,{GK:`Galíndez 74`,DEF:`Pacho 82, Hincapié 80, Estupiñán 78, Ordóñez 74, Preciado 72`,MID:`Caicedo 87, Páez 78, Franco 72, Vite 70`,ATT:`E. Valencia 78, Angulo 74, Arévalo 72, K. Rodríguez 70`});
S('Escócia',2026,{GK:`Gunn 74`,DEF:`Robertson 80, Tierney 76, Hickey 74, McKenna 72, Souttar 72, Patterson 70`,MID:`McTominay 84, McGinn 78, Ferguson 76, Christie 74`,ATT:`Adams 74, Shankland 70, Dykes 68, Hirst 66`});
S('Espanha',2026,{GK:`Unai Simón 84, Raya 84`,DEF:`Laporte 82, Cucurella 82, Grimaldo 82, Cubarsí 82, Llorente 80, Porro 80`,MID:`Rodri 90, Pedri 89, Fabián Ruiz 84, Zubimendi 83, Merino 82, Gavi 82`,ATT:`Lamine Yamal 92, Nico Williams 86, Oyarzabal 84, Dani Olmo 84, Ferran Torres 80, Pino 76`});
S('Estados Unidos',2026,{GK:`Turner 72`,DEF:`Dest 76, Richards 76, A. Robinson 78, Scally 74, Trusty 72, McKenzie 72`,MID:`McKennie 80, Adams 78, Reyna 76, Tillman 76`,ATT:`Pulisic 84, Balogun 78, Weah 74, Pepi 74, Aaronson 74`});
S('França',2026,{GK:`Maignan 88`,DEF:`Saliba 89, Koundé 86, Upamecano 85, Konaté 85, Theo Hernández 84, Lucas Hernández 80`,MID:`Tchouaméni 86, Rabiot 85, Kanté 82, Zaïre-Emery 80`,ATT:`Mbappé 93, Dembélé 90, Olise 87, Doué 84, Marcus Thuram 84, Cherki 82, Barcola 82`});
S('Gana',2026,{GK:`Ati-Zigi 72`,DEF:`Rahman 72, Seidu 72, Mumin 70, Opoku 70, Mensah 68`,MID:`Partey 80, Sibo 66, Yirenkyi 66, Boakye 64`,ATT:`Semenyo 82, Sulemana 76, Nuamah 76, I. Williams 76, Baah 72, Issahaku 72`});
S('Haiti',2026,{GK:`Placide 68`,DEF:`Arcus 68, Duverne 68, Delcroix 66, Pauguain 64, Experience 64`,MID:`Bellegarde 72, Pierre 64, Sainthe 62, Simon 62`,ATT:`Isidor 70, Nazon 68, Etienne 68, Casimir 66, Pierrot 66`});
S('Holanda',2026,{GK:`Verbruggen 80`,DEF:`Van Dijk 89, Timber 85, Van de Ven 84, Aké 83, Dumfries 82, Hato 80`,MID:`De Jong 86, Gravenberch 86, Reijnders 85, Koopmeiners 82`,ATT:`Gakpo 85, Malen 80, Depay 78, Brobbey 78, Kluivert 76`});
S('Inglaterra',2026,{GK:`Pickford 83`,DEF:`Stones 84, Guéhi 84, Reece James 82, Konsa 78, O'Reilly 78, Livramento 78`,MID:`Bellingham 90, Rice 88, Eze 82, Anderson 80, Mainoo 80, Rogers 80`,ATT:`Kane 91, Saka 88, Rashford 82, Gordon 80, Watkins 80, Madueke 78`});
S('Irã',2026,{GK:`Beiranvand 72`,DEF:`Kanaani 70, Khalilzadeh 70, Rezaeian 70, Hajsafi 68, Mohammadi 68`,MID:`Ezatolahi 72, Jahanbakhsh 72, Mohebi 72, Ghoddos 70, Ghaedi 70`,ATT:`Taremi 80, Dargahi 68, Alipour 66, Moghanlou 66`});
S('Iraque',2026,{GK:`Talib 66`,DEF:`Doski 68, Hussein Ali 66, Saadoon 64, Sulaka 64, Tahseen 64`,MID:`Al-Ammari 70, Iqbal 70, Yakob 66, Sher 64`,ATT:`Al-Hamadi 70, Aymen Hussein 68, Mohanad Ali 66, Jassim 64`});
S('Japão',2026,{GK:`Suzuki 76`,DEF:`Ito 80, Itakura 78, Tomiyasu 78, Watanabe 76, Sugawara 74`,MID:`Kubo 84, Kamada 80, Endo 78, Doan 78, Tanaka 76, Sano 74`,ATT:`Junya Ito 78, Maeda 76, Ueda 76, Nakamura 74`});
S('Jordânia',2026,{GK:`Abulaila 66`,DEF:`Haddad 66, Al-Arab 66, Nasib 64, Abu Hashish 64, Al-Rosan 64`,MID:`Ayed 66, Rawabdeh 64, Sadeh 64, Jamous 62`,ATT:`Al-Taamari 74, Olwan 68, Al-Mardi 64, Abu Zrayq 62`});
S('Marrocos',2026,{GK:`Bounou 82`,DEF:`Hakimi 88, Mazraoui 80, Aguerd 78, Riad 76, Salah-Eddine 76, Issa Diop 76`,MID:`Amrabat 80, El Aynaoui 78, El Khannouss 78, Ounahi 76, Bouaddi 76`,ATT:`Brahim Díaz 84, Ezzalzouli 76, El Kaabi 74, Talbi 72`});
S('México',2026,{GK:`Ochoa 74`,DEF:`Edson Álvarez 78, Johan Vásquez 76, Reyes 74, Gallardo 74, Jorge Sánchez 74`,MID:`Romo 74, Pineda 74, Fidalgo 74, Obed Vargas 72, Lira 70`,ATT:`Santiago Giménez 80, Raúl Jiménez 76, Quiñones 74, Huerta 74, Alexis Vega 74`});
S('Noruega',2026,{GK:`Nyland 72`,DEF:`Ryerson 78, Ajer 78, Heggem 74, Østigård 72, Wolfe 72`,MID:`Ødegaard 88, Berge 78, Aursnes 76, Thorstvedt 74, Berg 74`,ATT:`Haaland 93, Sørloth 80, Nusa 78, Strand Larsen 76, Bobb 76, Schjelderup 74`});
S('Nova Zelândia',2026,{GK:`Crocombe 66`,DEF:`Bindon 70, Cacace 70, Payne 66, Boxall 66, Surman 66`,MID:`Garbett 68, Stamenic 68, Singh 66, Bell 66`,ATT:`Wood 74, Barbarouses 64, Waine 64, Just 62`});
S('Panamá',2026,{GK:`Mejía 66`,DEF:`Murillo 72, Escobar 68, Davis 66, Córdoba 66, Miller 64`,MID:`Carrasquilla 70, Godoy 66, Bárcenas 66, Harvey 64`,ATT:`Fajardo 68, I. Díaz 66, Waterman 66`});
S('Paraguai',2026,{GK:`Fernández 70`,DEF:`Gustavo Gómez 78, Alderete 74, Balbuena 72, Alonso 72, Cáceres 70`,MID:`Diego Gómez 76, Cubas 72, Bobadilla 70, Galarza 70`,ATT:`Enciso 78, Almirón 76, Sosa 74, Sanabria 72, Ávalos 68`});
S('Portugal',2026,{GK:`Diogo Costa 85`,DEF:`Rúben Dias 88, Nuno Mendes 86, Dalot 82, Cancelo 82, Inácio 82, Nélson Semedo 78`,MID:`Bernardo Silva 89, Vitinha 88, Bruno Fernandes 88, João Neves 87, Rúben Neves 80`,ATT:`Leão 86, Cristiano Ronaldo 84, Pedro Neto 82, Conceição 80, João Félix 80, Gonçalo Ramos 78`});
S('RD Congo',2026,{GK:`Epolo 68`,DEF:`Mbemba 76, Wan-Bissaka 76, Tuanzebe 72, Masuaku 70, Kayembe 70`,MID:`Sadiki 74, Pickel 72, Mukau 70, Bongonda 70`,ATT:`Wissa 78, Bakambu 72, Mayele 70, Banza 68`});
S('Senegal',2026,{GK:`É. Mendy 80`,DEF:`Koulibaly 78, Niakhaté 76, Diatta 74, Diouf 74, Jakobs 72`,MID:`Pape Matar Sarr 80, Camara 78, I. Gueye 76, Pape Gueye 76, Diarra 74`,ATT:`Mané 82, I. Sarr 80, Jackson 80, I. Ndiaye 78, Mbaye 74`});
S('Suécia',2026,{GK:`Johansson 74`,DEF:`Lindelöf 80, Hien 78, Gudmundsson 76, Holm 76, Starfelt 74`,MID:`Bergvall 80, Ayari 76, Svanberg 74, Karlström 70`,ATT:`Isak 88, Gyökeres 88, Elanga 78, Nygren 74`});
S('Suíça',2026,{GK:`Kobel 86`,DEF:`Akanji 84, Ricardo Rodríguez 76, Elvedi 76, Widmer 74, Muheim 72`,MID:`Xhaka 84, Freuler 78, Zakaria 78, Aebischer 76, Vargas 78, Jashari 76`,ATT:`Embolo 78, Ndoye 78, Okafor 76, Amdouni 74`});
S('Tchéquia',2026,{GK:`Kovář 74`,DEF:`Coufal 76, Hranáč 72, Holeš 72, Krejčí 74, Jurásek 72`,MID:`Souček 80, Šulc 76, Červ 74, Provod 72`,ATT:`Schick 82, Hložek 76, Chytil 72, Chorý 72`});
S('Tunísia',2026,{GK:`Dahmen 70`,DEF:`Abdi 72, Talbi 72, Valery 72, Bronn 70, Rekik 70`,MID:`Skhiri 78, Khedira 74, Mejbri 74, Gharbi 70`,ATT:`Tounekti 74, Achouri 72, Saad 70, Mastouri 70`});
S('Turquia',2026,{GK:`Çakır 80`,DEF:`Kadıoğlu 80, Demiral 78, Çelik 76, Kabak 74, Müldür 74`,MID:`Güler 86, Çalhanoğlu 86, Kökçü 78, Yüksek 76, Uzun 76`,ATT:`Yıldız 86, Aktürkoğlu 78, Akgün 76, Yılmaz 76`});
S('Uruguai',2026,{GK:`Rochet 74`,DEF:`Araújo 84, J. Giménez 84, Olivera 80, Piquerez 76, Viña 74, Cáceres 74`,MID:`Valverde 90, Ugarte 82, Bentancur 80, De Arrascaeta 80, De la Cruz 78`,ATT:`Darwin Núñez 82, Pellistri 72, Canobbio 70, Aguirre 70, Viñas 70`});
S('Uzbequistão',2026,{GK:`Yusupov 66`,DEF:`Khusanov 78, Ashurmatov 66, Alijonov 64, Sayfiev 64, Nasrullaev 64`,MID:`Fayzullaev 70, Shukurov 68, Masharipov 68, Urunov 66`,ATT:`Shomurodov 72, Sergeev 66, Amonov 62`});

// ===== Copa 2022 =====
S('Alemanha',2022,{GK:`Neuer 89`,DEF:`Rüdiger 86, Süle 83, Schlotterbeck 80, Raum 78, Kehrer 76`,MID:`Kimmich 88, Gündoğan 86, Goretzka 85, Musiala 87`,ATT:`Müller 84, Havertz 85, Gnabry 85, Sané 86, Füllkrug 78`});
S('Arábia Saudita',2022,{GK:`Al-Owais 74`,DEF:`Al-Amri 72, Al-Bulayhi 72, Al-Shahrani 72, Abdulhamid 72, Tambakti 70`,MID:`Al-Faraj 74, Kanno 72, Al-Malki 72, S. Al-Dawsari 76`,ATT:`Al-Buraikan 70, Al-Shehri 72, Al-Abed 68`});
S('Argentina',2022,{GK:`E. Martínez 86`,DEF:`Molina 80, Romero 84, Otamendi 82, Tagliafico 78`,MID:`De Paul 83, Enzo Fernández 82, Mac Allister 84`,ATT:`Messi 97, J. Álvarez 84, Di María 86, Lautaro 83`});
S('Austrália',2022,{GK:`Ryan 74`,DEF:`Souttar 74, Rowles 70, Behich 72, Atkinson 70, Karačić 68`,MID:`Mooy 74, Irvine 74, McGree 72, Hrustić 72`,ATT:`Leckie 72, Duke 70, Goodwin 72, Maclaren 70`});
S('Bélgica',2022,{GK:`Courtois 90`,DEF:`Alderweireld 82, Vertonghen 80, Castagne 80, Meunier 80, Carrasco 82`,MID:`De Bruyne 91, Tielemans 82, Witsel 80, Onana 80`,ATT:`Hazard 82, Lukaku 84, Mertens 80, Trossard 80, Doku 78`});
S('Brasil',2022,{GK:`Alisson 89`,DEF:`Marquinhos 87, Thiago Silva 85, Éder Militão 86, Danilo 80, Alex Sandro 80`,MID:`Casemiro 88, Fabinho 85, Paquetá 84, Fred 79`,ATT:`Neymar 91, Vinícius Jr 88, Raphinha 84, Rodrygo 83, Richarlison 82`});
S('Camarões',2022,{GK:`Onana 80`,DEF:`Castelletto 72, Nkoulou 72, Fai 70, Tolo 70, Ngadeu 70`,MID:`Anguissa 82, Hongla 74, Ondoa 70, Ngamaleu 72`,ATT:`Toko Ekambi 76, Choupo-Moting 78, Aboubakar 76, Mbeumo 76`});
S('Canadá',2022,{GK:`Borjan 70`,DEF:`Johnston 72, Miller 70, Vitória 68, Adekugbe 68, Laryea 70`,MID:`Eustáquio 76, Osorio 70, Kaye 70, Hutchinson 68`,ATT:`Davies 84, David 80, Larin 74, Buchanan 74`});
S('Catar',2022,{GK:`Barsham 70`,DEF:`Khoukhi 68, Al-Rawi 68, Hassan 68, Pedro Miguel 68, Al-Brake 66`,MID:`Hatem 70, Boudiaf 70, Madibo 66, Al-Haydos 70`,ATT:`Afif 74, Almoez Ali 72, Muntari 68`});
S('Coreia do Sul',2022,{GK:`Kim Seung-gyu 76`,DEF:`Kim Min-jae 84, Kim Young-gwon 74, Kim Moon-hwan 74, Yoon Jong-gyu 70, Hong Chul 70`,MID:`Jung Woo-young 74, Hwang In-beom 78, Lee Jae-sung 78, Kwon Chang-hoon 72`,ATT:`Son 88, Hwang Hee-chan 80, Cho Gue-sung 74`});
S('Costa Rica',2022,{GK:`Navas 84`,DEF:`Calvo 72, Duarte 70, Oviedo 72, Fuller 72, Waston 70`,MID:`Borges 70, Tejeda 70, Torres 70, Bolaños 70`,ATT:`Campbell 74, Contreras 70, Venegas 68`});
S('Croácia',2022,{GK:`Livaković 83`,DEF:`Gvardiol 86, Lovren 80, Ćaleta-Car 78, Juranović 78, Sosa 78`,MID:`Modrić 90, Brozović 85, Kovačić 87, Pašalić 80`,ATT:`Perišić 83, Kramarić 80, Livaja 78, Petković 74`});
S('Dinamarca',2022,{GK:`Schmeichel 83`,DEF:`Kjær 82, Christensen 84, Andersen 80, Maehle 80, Vestergaard 76`,MID:`Eriksen 85, Højbjerg 82, Delaney 78, Hjulmand 76`,ATT:`Dolberg 76, Wind 76, Skov Olsen 76, Cornelius 74`});
S('Equador',2022,{GK:`Domínguez 72`,DEF:`Hincapié 80, Torres 74, Estupiñán 78, Preciado 72, Arboleda 70`,MID:`Caicedo 80, Plata 72, Mena 70, Franco 72`,ATT:`E. Valencia 80, Estrada 70, Ibarra 70`});
S('Espanha',2022,{GK:`Unai Simón 82`,DEF:`Carvajal 84, Laporte 85, Jordi Alba 83, Pau Torres 80, Azpilicueta 78`,MID:`Rodri 87, Pedri 88, Gavi 84, Busquets 84, Koke 83`,ATT:`Morata 82, Ferran Torres 80, Asensio 80, Dani Olmo 82, Nico Williams 78`});
S('Estados Unidos',2022,{GK:`Turner 76`,DEF:`Dest 78, Ream 74, Zimmerman 74, A. Robinson 78, Richards 76`,MID:`Adams 82, McKennie 80, Musah 78, Reyna 78`,ATT:`Pulisic 83, Weah 78, Aaronson 78, Wright 74, Ferreira 72`});
S('França',2022,{GK:`Lloris 86`,DEF:`Koundé 85, Varane 87, Upamecano 85, Theo Hernández 86, Konaté 82`,MID:`Tchouaméni 84, Rabiot 83, Camavinga 82, Griezmann 89`,ATT:`Mbappé 94, Dembélé 85, Giroud 83, Coman 82, Thuram 80`});
S('Gana',2022,{GK:`Ati-Zigi 72`,DEF:`Salisu 76, Amartey 74, Rahman 76, Djiku 74, Seidu 72`,MID:`Partey 84, Kudus 80, Samed 74, Owusu 70`,ATT:`I. Williams 78, J. Ayew 74, A. Ayew 74, Semenyo 72`});
S('Holanda',2022,{GK:`Noppert 76`,DEF:`Van Dijk 89, De Vrij 84, Aké 84, Dumfries 82, Blind 78`,MID:`De Jong 87, Klaassen 78, De Roon 78, Berghuis 78`,ATT:`Gakpo 84, Depay 84, Bergwijn 80, Weghorst 78, Malen 78`});
S('Inglaterra',2022,{GK:`Pickford 83`,DEF:`Walker 84, Stones 85, Maguire 80, Shaw 83, Trippier 82`,MID:`Rice 85, Bellingham 86, Henderson 80, Mount 82`,ATT:`Kane 90, Saka 85, Foden 86, Sterling 84, Rashford 84`});
S('Irã',2022,{GK:`Beiranvand 74`,DEF:`Hajsafi 70, Pouraliganji 70, Kanaani 70, Rezaeian 72, Mohammadi 70`,MID:`Ezatolahi 72, Gholizadeh 72, Jahanbakhsh 74, Nourollahi 70`,ATT:`Taremi 80, Azmoun 78, Ghoddos 72`});
S('Japão',2022,{GK:`Gonda 76`,DEF:`Yoshida 78, Tomiyasu 82, Itakura 78, Sakai 76, Nagatomo 74`,MID:`Endo 80, Morita 78, Tanaka 76, Kamada 80`,ATT:`Mitoma 84, Kubo 80, Minamino 78, Asano 76, Maeda 76`});
S('Marrocos',2022,{GK:`Bounou 83`,DEF:`Hakimi 85, Aguerd 79, Saïss 78, Mazraoui 77, Attiat-Allah 72`,MID:`Amrabat 82, Ounahi 76, Amallah 74, Ziyech 80, Sabiri 72`,ATT:`En-Nesyri 78, Boufal 77, Cheddira 70`});
S('México',2022,{GK:`Ochoa 80`,DEF:`Montes 76, Moreno 76, Vásquez 76, Gallardo 76, Araujo 76`,MID:`Álvarez 80, Herrera 80, Guardado 78, Chávez 74`,ATT:`Lozano 80, Jiménez 78, Vega 76, Henry Martín 74, Antuna 74`});
S('País de Gales',2022,{GK:`Hennessey 72`,DEF:`B. Davies 76, Mepham 72, Rodon 70, Roberts 70, N. Williams 74`,MID:`Ampadu 74, Ramsey 76, Wilson 70, Allen 70`,ATT:`Bale 82, James 72, Moore 70, Johnson 72`});
S('Polônia',2022,{GK:`Szczęsny 84`,DEF:`Bednarek 76, Glik 74, Cash 78, Kiwior 74, Bereszyński 74`,MID:`Zieliński 82, Krychowiak 76, Szymański 74, Bielik 76`,ATT:`Lewandowski 90, Milik 78, Świderski 74`});
S('Portugal',2022,{GK:`Diogo Costa 82`,DEF:`Cancelo 87, Rúben Dias 88, Pepe 82, Raphaël Guerreiro 83, Danilo Pereira 80`,MID:`Bruno Fernandes 88, Bernardo Silva 89, Palhinha 82, William Carvalho 78`,ATT:`Cristiano Ronaldo 88, João Félix 84, Leão 84, Diogo Jota 84, Gonçalo Ramos 78`});
S('Senegal',2022,{GK:`É. Mendy 85`,DEF:`Koulibaly 87, Diallo 78, Sabaly 76, Jakobs 74, Cissé 76`,MID:`I. Gueye 82, P. Gueye 76, Kouyaté 74, N. Mendy 74`,ATT:`Mané 88, Sarr 80, Dia 76, Diatta 76`});
S('Sérvia',2022,{GK:`Vanja Milinković-Savić 74`,DEF:`Pavlović 74, Milenković 78, Veljković 70, Živković 70, Mladenović 72`,MID:`S. Milinković-Savić 84, Kostić 80, Gudelj 72, Lukić 74`,ATT:`Mitrović 80, Tadić 80, Vlahović 82, Jović 74`});
S('Suíça',2022,{GK:`Sommer 83`,DEF:`Akanji 84, Elvedi 80, Schär 80, Ricardo Rodríguez 80, Widmer 76`,MID:`Xhaka 85, Freuler 80, Sow 80, Shaqiri 80`,ATT:`Embolo 80, Vargas 78, Okafor 76`});
S('Tunísia',2022,{GK:`Dahmen 72`,DEF:`Talbi 74, Meriah 70, Bronn 72, Abdi 72, Drager 70`,MID:`Skhiri 78, Laïdouni 72, Sliti 72, Msakni 74`,ATT:`Khazri 74, Jebali 72, Souissi 70`});
S('Uruguai',2022,{GK:`Rochet 78`,DEF:`J. Giménez 84, Araújo 84, Godín 78, Olivera 80, Viña 76`,MID:`Valverde 87, Bentancur 84, De la Cruz 82, Vecino 78`,ATT:`Suárez 82, Núñez 82, Cavani 81, Pellistri 76`});

// ===== Copa 2018 =====
S('Alemanha',2018,{GK:`Neuer 90`,DEF:`Hummels 86, Boateng 85, Kimmich 84, Rüdiger 80, Hector 74`,MID:`Kroos 90, Özil 86, Khedira 84, Goretzka 82, Draxler 82`,ATT:`Müller 85, Reus 85, Werner 84, Gómez 76`});
S('Arábia Saudita',2018,{GK:`Al-Owais 72`,DEF:`Al-Breik 70, Omar Hawsawi 68, Osama Hawsawi 66, Al-Burayk 68, Al-Shahrani 70`,MID:`Al-Faraj 74, Otayf 70, Al-Jassim 68, Al-Muwallad 70`,ATT:`Al-Sahlawi 72, S. Al-Dawsari 70, Al-Shehri 66`});
S('Argentina',2018,{GK:`Armani 76`,DEF:`Otamendi 80, Tagliafico 76, Mercado 74, Rojo 74, Acuña 74`,MID:`Banega 82, Mascherano 82, Biglia 78, Di María 86, Meza 76`,ATT:`Messi 93, Agüero 88, Higuaín 84, Dybala 84`});
S('Austrália',2018,{GK:`Ryan 76`,DEF:`Risdon 70, Sainsbury 70, Milligan 72, Behich 70, Degenek 68`,MID:`Mooy 76, Jedinak 76, Rogic 74, Leckie 72`,ATT:`Cahill 74, Kruse 72, Nabbout 68, Arzani 68`});
S('Bélgica',2018,{GK:`Courtois 90`,DEF:`Alderweireld 86, Kompany 86, Vertonghen 85, Meunier 80, Vermaelen 78`,MID:`De Bruyne 92, Witsel 84, Fellaini 80, Chadli 78, Dembélé 80`,ATT:`Hazard 91, Lukaku 87, Mertens 82`});
S('Brasil',2018,{GK:`Alisson 89`,DEF:`Marcelo 87, Thiago Silva 86, Miranda 82, Danilo 78, Fágner 72`,MID:`Coutinho 88, Casemiro 86, Willian 84, Fernandinho 82, Paulinho 80`,ATT:`Neymar 92, Firmino 84, Gabriel Jesus 82, Douglas Costa 82`});
S('Colômbia',2018,{GK:`Ospina 80`,DEF:`Mina 78, D. Sánchez 78, S. Arias 76, Mojica 74, Zapata 72`,MID:`James Rodríguez 86, Cuadrado 80, Barrios 76, Lerma 74, Uribe 72`,ATT:`Falcao 82, Muriel 78, Quintero 78`});
S('Coreia do Sul',2018,{GK:`Cho Hyeon-woo 76`,DEF:`Kim Young-gwon 74, Jang Hyun-soo 72, Yun Young-sun 70, Lee Yong 70, Hong Chul 70`,MID:`Ki Sung-yueng 76, Lee Jae-sung 74, Koo Ja-cheol 72, Jung Woo-young 72`,ATT:`Son 86, Hwang Hee-chan 74, Kim Shin-wook 70`});
S('Costa Rica',2018,{GK:`Navas 86`,DEF:`Gamboa 72, Acosta 72, G. González 72, Waston 70, Duarte 70`,MID:`Ruiz 76, Borges 70, Tejeda 70, Guzmán 68`,ATT:`Campbell 76, Venegas 68, Colindres 66`});
S('Croácia',2018,{GK:`Subašić 80`,DEF:`Vrsaljko 80, Lovren 80, Vida 79, Strinić 74, Corluka 74`,MID:`Rakitić 86, Modrić 90, Brozović 82, Perišić 83`,ATT:`Mandžukić 82, Rebić 78, Kramarić 76`});
S('Dinamarca',2018,{GK:`Schmeichel 84`,DEF:`Kjær 80, Christensen 80, Dalsgaard 74, Jørgensen 72, Knudsen 70`,MID:`Eriksen 88, Delaney 78, Schöne 78, Sisto 74`,ATT:`Poulsen 76, Braithwaite 74, N. Jørgensen 72`});
S('Egito',2018,{GK:`El-Hadary 70`,DEF:`Hegazi 72, Ahmed Fathy 70, Abdel-Shafy 70, Gabr 68, Rabia 68`,MID:`Elneny 74, Trezeguet 72, Warda 68, Hamed 68`,ATT:`Salah 90, Kahraba 70, Soliman 66`});
S('Espanha',2018,{GK:`De Gea 88`,DEF:`Sergio Ramos 90, Piqué 87, Jordi Alba 86, Carvajal 84, Nacho 80`,MID:`Iniesta 89, Isco 88, David Silva 88, Busquets 86, Thiago 86, Koke 85`,ATT:`Diego Costa 85, Asensio 82, Aspas 80`});
S('França',2018,{GK:`Lloris 87`,DEF:`Pavard 82, Varane 88, Umtiti 84, L. Hernandez 82, Kimpembe 80`,MID:`Kanté 88, Pogba 87, Matuidi 82, Tolisso 80`,ATT:`Mbappé 90, Griezmann 89, Giroud 82`});
S('Inglaterra',2018,{GK:`Pickford 80`,DEF:`Walker 84, Stones 82, Maguire 82, Trippier 82, Young 78`,MID:`Henderson 80, Alli 82, Dier 78, Lingard 78, Loftus-Cheek 74`,ATT:`Kane 90, Sterling 84, Rashford 80, Vardy 78`});
S('Irã',2018,{GK:`Beiranvand 74`,DEF:`Rezaeian 70, Hosseini 70, Montazeri 70, Pouraliganji 70, Cheshmi 68`,MID:`Shojaei 74, Jahanbakhsh 74, Amiri 72, Ezatolahi 70`,ATT:`Azmoun 78, Taremi 74, Ansarifard 70`});
S('Islândia',2018,{GK:`Halldórsson 72`,DEF:`Sævarsson 66, R. Sigurðsson 70, Árnason 68, Skúlason 66, Magnússon 66`,MID:`G. Sigurðsson 78, Gunnarsson 70, Guðmundsson 70, Bjarnason 68, Hallfreðsson 68`,ATT:`Finnbogason 72, Bödvarsson 66, Gíslason 66`});
S('Japão',2018,{GK:`Kawashima 72`,DEF:`Nagatomo 76, Sakai 74, Yoshida 74, Shoji 72, Ugajin 68`,MID:`Kagawa 78, Hasebe 76, Shibasaki 76, Haraguchi 76, Inui 76`,ATT:`Honda 78, Osako 76, Okazaki 74`});
S('Marrocos',2018,{GK:`Munir 74`,DEF:`Benatia 80, Saïss 76, Hakimi 76, Dirar 72, N. Amrabat 74`,MID:`Ziyech 80, Belhanda 76, Boussoufa 72, Ait Bennasser 70`,ATT:`Carcela 72, El Kaabi 70, Boutaïb 70`});
S('México',2018,{GK:`Ochoa 84`,DEF:`Márquez 82, Salcedo 76, Moreno 76, Gallardo 74, Layún 72`,MID:`Herrera 82, Guardado 80, Vela 76, Álvarez 76`,ATT:`Chicharito 82, Lozano 82, Corona 76`});
S('Nigéria',2018,{GK:`Uzoho 70`,DEF:`Omeruo 74, Balogun 72, Ekong 72, Ola Aina 72, Echiéjilé 70`,MID:`Mikel 78, Ndidi 80, Iwobi 78, Etebo 72`,ATT:`Moses 76, Musa 78, Iheanacho 74`});
S('Panamá',2018,{GK:`Penedo 68`,DEF:`Murillo 68, Escobar 66, Román Torres 68, Cummings 66, Davis 66`,MID:`Gómez 68, Cooper 66, Godoy 68, Bárcenas 66`,ATT:`Tejada 66, Blas Pérez 64, G. Torres 66`});
S('Peru',2018,{GK:`Gallese 74`,DEF:`Advíncula 72, Ramos 72, A. Rodríguez 72, Trauco 70, Aquino 66`,MID:`Yotún 74, Tapia 74, Cueva 74, Carrillo 74`,ATT:`Guerrero 80, Farfán 78, Flores 74`});
S('Polônia',2018,{GK:`Szczęsny 82`,DEF:`Glik 80, Pazdan 76, Bereszyński 72, Rybus 72, Cionek 70`,MID:`Zieliński 82, Krychowiak 80, Błaszczykowski 76, Grosicki 76`,ATT:`Lewandowski 91, Milik 80, Teodorczyk 70`});
S('Portugal',2018,{GK:`Rui Patrício 82`,DEF:`Pepe 82, José Fonte 78, Raphaël Guerreiro 80, Cédric 76, Bruno Alves 76`,MID:`Bernardo Silva 86, William Carvalho 80, João Mário 78, Adrien Silva 78`,ATT:`Cristiano Ronaldo 92, Gonçalo Guedes 80, André Silva 78`});
S('Rússia',2018,{GK:`Akinfeev 78`,DEF:`Mário Fernandes 74, Kutepov 70, Ignashevich 70, Zhirkov 72, Smolnikov 68`,MID:`Golovin 76, Gazinsky 74, Zobnin 72, Samedov 72`,ATT:`Cheryshev 76, Dzyuba 74, Smolov 70`});
S('Senegal',2018,{GK:`N'Diaye 72`,DEF:`Koulibaly 86, Sané 74, Sabaly 74, Wagué 72, Gassama 70`,MID:`I. Gueye 80, Kouyaté 76, A. N'Diaye 72, Ndoye 70`,ATT:`Mané 86, Niang 78, Sarr 76, Diouf 72`});
S('Sérvia',2018,{GK:`Stojković 72`,DEF:`Kolarov 80, Ivanović 76, Milenković 74, Rukavina 70, Tošić 70`,MID:`Matić 82, S. Milinković-Savić 82, Tadić 80, Ljajić 76`,ATT:`Mitrović 78, Kostić 76, Prijović 70`});
S('Suécia',2018,{GK:`Olsen 76`,DEF:`Lindelöf 80, Granqvist 76, Augustinsson 74, Lustig 72, Krafth 70`,MID:`Forsberg 80, Ekdal 76, Larsson 74, Claesson 72`,ATT:`Berg 74, Toivonen 72, Durmaz 70`});
S('Suíça',2018,{GK:`Sommer 82`,DEF:`Lichtsteiner 78, Schär 78, Akanji 76, Ricardo Rodríguez 80, Lang 70`,MID:`Xhaka 82, Shaqiri 82, Behrami 76, Zuber 76, Dzemaili 76`,ATT:`Seferović 76, Embolo 74, Drmić 70`});
S('Tunísia',2018,{GK:`Mathlouthi 72`,DEF:`Meriah 70, Bronn 70, Abdennour 70, Maâloul 72, Nagguez 68`,MID:`Skhiri 76, Khazri 76, Sassi 74, Badri 70, Sliti 72`,ATT:`Msakni 76, F. Ben Youssef 70, Khenissi 70`});
S('Uruguai',2018,{GK:`Muslera 82`,DEF:`Godín 87, J. Giménez 85, Cáceres 76, Laxalt 76, Varela 74`,MID:`Bentancur 80, Vecino 78, Torreira 78, Nández 76`,ATT:`Cavani 88, Suárez 87, Stuani 74`});

// ===== Copa 2014 =====
S('Alemanha',2014,{GK:`Neuer 94`,DEF:`Lahm 90, Boateng 88, Hummels 88, Höwedes 82, Mertesacker 80`,MID:`Kroos 90, Schweinsteiger 88, Khedira 84, Özil 87`,ATT:`Müller 89, Klose 85, Götze 84`});
S('Argélia',2014,{GK:`M'Bolhi 76`,DEF:`Bougherra 74, Halliche 72, Mandi 72, Ghoulam 72, Mesbah 70`,MID:`Feghouli 78, Brahimi 76, Bentaleb 74, Taïder 72, Lacen 70`,ATT:`Slimani 76, Soudani 74, Djabou 70`});
S('Argentina',2014,{GK:`Romero 80`,DEF:`Zabaleta 80, Garay 78, Demichelis 76, Rojo 76, Basanta 70`,MID:`Mascherano 86, Di María 86, Lavezzi 80, Biglia 78, Gago 76, Pérez 74`,ATT:`Messi 95, Agüero 87, Higuaín 85, Palacio 78`});
S('Austrália',2014,{GK:`Ryan 76`,DEF:`Davidson 70, Spiranovic 72, Wilkinson 70, Franjic 70, McGowan 68`,MID:`Jedinak 78, Bresciano 72, Milligan 72, Leckie 70`,ATT:`Cahill 78, Kruse 74, Oar 66`});
S('Bélgica',2014,{GK:`Courtois 86`,DEF:`Kompany 86, Vertonghen 82, Alderweireld 78, Vermaelen 78, Van Buyten 74`,MID:`Hazard 88, De Bruyne 82, Witsel 82, Fellaini 80, Dembélé 80, Mirallas 78`,ATT:`Lukaku 82, Mertens 76, Origi 72`});
S('Bósnia',2014,{GK:`Begović 76`,DEF:`Spahić 72, Kolašinac 72, Bičakčić 70, Mujdža 70, Vršajević 70`,MID:`Pjanić 82, Misimović 74, Besić 72, Medunjanin 72`,ATT:`Džeko 85, Ibišević 76, Visća 72`});
S('Brasil',2014,{GK:`Júlio César 80`,DEF:`Thiago Silva 88, Dani Alves 85, David Luiz 84, Marcelo 84, Maxwell 78`,MID:`Oscar 84, Luiz Gustavo 80, Fernandinho 80, Paulinho 78, Ramires 78`,ATT:`Neymar 90, Hulk 82, Willian 80, Fred 76, Bernard 76`});
S('Camarões',2014,{GK:`Itandje 70`,DEF:`Matip 76, Nkoulou 74, Chedjou 72, Assou-Ekotto 72, Mbia 70`,MID:`Song 78, Enoh 70, Moukandjo 72, Nguemo 68`,ATT:`Eto'o 80, Choupo-Moting 74, Aboubakar 74`});
S('Chile',2014,{GK:`Bravo 84`,DEF:`Medel 80, Mena 74, Jara 74, Isla 74, Díaz 72`,MID:`Vidal 86, Aránguiz 80, Valdivia 76, Gutiérrez 70`,ATT:`Alexis Sánchez 88, Vargas 78, Beausejour 74`});
S('Colômbia',2014,{GK:`Ospina 82`,DEF:`Zúñiga 78, Zapata 76, Yepes 74, Armero 74, Arias 72`,MID:`James Rodríguez 88, Cuadrado 82, Guarín 78, Aguilar 74, C. Sánchez 76`,ATT:`Jackson Martínez 80, Quintero 76, Gutiérrez 74, Ibarbo 72`});
S('Coreia do Sul',2014,{GK:`Jung Sung-ryong 74`,DEF:`Lee Yong 72, Hong Jeong-ho 72, Kim Young-gwon 72, Yun Suk-young 70, Kim Jin-su 70`,MID:`Ki Sung-yueng 76, Koo Ja-cheol 74, Lee Chung-yong 74, Han Kook-young 70`,ATT:`Son 78, Park Chu-young 72, Kim Shin-wook 70`});
S('Costa do Marfim',2014,{GK:`Barry 72`,DEF:`Kolo Touré 76, Aurier 76, Bamba 70, Boka 70, Tioté 74`,MID:`Yaya Touré 88, Gervinho 78, Die 70, Serey Dié 70`,ATT:`Drogba 82, Bony 78, Kalou 74`});
S('Costa Rica',2014,{GK:`Navas 88`,DEF:`Gamboa 74, Duarte 74, G. González 72, Umaña 72, J. Díaz 70`,MID:`Borges 72, Tejeda 72, Bolaños 72, Ruiz 80, Cubero 68`,ATT:`Campbell 78, Urena 70, Brenes 66`});
S('Croácia',2014,{GK:`Pletikosa 76`,DEF:`Srna 80, Lovren 78, Corluka 76, Vrsaljko 74, Pranjić 70`,MID:`Modrić 88, Rakitić 86, Perišić 80, Kovačić 80, Brozović 72`,ATT:`Mandžukić 84, Olić 76, Jelavić 74`});
S('Equador',2014,{GK:`Domínguez 72`,DEF:`Paredes 70, Erazo 70, Achilier 70, W. Ayoví 70, J. Ayoví 68`,MID:`A. Valencia 78, Noboa 74, Castillo 70, Montero 70`,ATT:`Enner Valencia 78, F. Caicedo 72, Arroyo 66`});
S('Espanha',2014,{GK:`Casillas 88`,DEF:`Sergio Ramos 88, Piqué 85, Jordi Alba 86, Azpilicueta 78, Juanfran 74`,MID:`Iniesta 90, Xavi 88, Xabi Alonso 86, Busquets 86, Silva 86, Cesc 84, Koke 80`,ATT:`Diego Costa 84, Pedro 82, Mata 82, Torres 80`});
S('Estados Unidos',2014,{GK:`Howard 82`,DEF:`F. Johnson 74, Cameron 72, Besler 72, Beasley 70, Gonzalez 70`,MID:`Dempsey 80, Bradley 76, Jones 74, Beckerman 70, Zusi 70`,ATT:`Altidore 74, Johannsson 70, Wondolowski 68`});
S('França',2014,{GK:`Lloris 86`,DEF:`Varane 84, Koscielny 80, Sagna 78, Evra 78, Debuchy 76`,MID:`Pogba 84, Matuidi 82, Cabaye 80, Valbuena 78`,ATT:`Benzema 88, Giroud 80, Griezmann 80`});
S('Gana',2014,{GK:`Kwarasey 70`,DEF:`J. Mensah 74, J. Asamoah 74, Boye 70, Afful 70, Opare 68`,MID:`Essien 80, K. Asamoah 80, Boateng 76, Muntari 74, Badu 72`,ATT:`Gyan 80, A. Ayew 76, J. Ayew 72`});
S('Grécia',2014,{GK:`Karnezis 72`,DEF:`Manolas 76, Papastathopoulos 76, Torosidis 72, Holebas 72, Moras 70`,MID:`Karagounis 72, Samaras 72, Maniatis 70, Katsouranis 70`,ATT:`Mitroglou 74, Gekas 68, Salpingidis 66`});
S('Holanda',2014,{GK:`Cillessen 80`,DEF:`Vlaar 78, De Vrij 78, Blind 78, Martins Indi 74, Janmaat 74`,MID:`Sneijder 86, Wijnaldum 76, De Jong 78, Kuyt 76, De Guzmán 74`,ATT:`Robben 91, Van Persie 88, Depay 76`});
S('Honduras',2014,{GK:`Valladares 72`,DEF:`Figueroa 72, Bernárdez 70, J. C. García 70, Izaguirre 70, Beckeles 66`,MID:`W. Palacios 72, Garrido 68, Claros 66, Espinoza 68`,ATT:`Costly 68, Bengtson 68, J. Palacios 66`});
S('Inglaterra',2014,{GK:`Hart 84`,DEF:`Cahill 76, Jagielka 76, Baines 76, Johnson 74, Shaw 74`,MID:`Gerrard 86, Lampard 80, Henderson 76, Wilshere 76, Barkley 74`,ATT:`Rooney 86, Sturridge 82, Welbeck 76, Sterling 78`});
S('Irã',2014,{GK:`Haghighi 70`,DEF:`Hajsafi 70, Hosseini 68, Pouraliganji 68, Sadeghi 66, Montazeri 68`,MID:`Dejagah 74, Teymourian 70, Nekounam 70, Shojaei 70`,ATT:`Ghoochannejhad 70, Jahanbakhsh 70, Azmoun 68`});
S('Itália',2014,{GK:`Buffon 88`,DEF:`Chiellini 84, Bonucci 84, Barzagli 80, Darmian 74, De Sciglio 74`,MID:`Pirlo 88, Verratti 82, De Rossi 82, Marchisio 82, Candreva 76`,ATT:`Balotelli 82, Immobile 78, Cassano 76, Insigne 76`});
S('Japão',2014,{GK:`Kawashima 72`,DEF:`Nagatomo 76, Uchida 74, Yoshida 74, Konno 70, Sakai 72`,MID:`Honda 80, Kagawa 78, Hasebe 76, Endo 74, Yamaguchi 72`,ATT:`Okazaki 76, Osako 72, Kakitani 68`});
S('México',2014,{GK:`Ochoa 84`,DEF:`Márquez 80, Moreno 74, Salcido 74, Aguilar 74, Layún 72`,MID:`Herrera 78, Guardado 78, Dos Santos 78, Vázquez 74`,ATT:`Chicharito 80, Peralta 76, Giovani 76`});
S('Nigéria',2014,{GK:`Enyeama 80`,DEF:`Yobo 72, Oboabona 70, Ambrose 70, Echiéjilé 70, Oshaniwa 68`,MID:`Mikel 78, Moses 76, Onazi 72, Odemwingie 72`,ATT:`Emenike 74, Musa 74, Oduamadi 66`});
S('Portugal',2014,{GK:`Rui Patrício 80`,DEF:`Pepe 84, Coentrão 80, Bruno Alves 78, João Pereira 74, Almeida 72`,MID:`Moutinho 84, Meireles 78, Veloso 76, William Carvalho 74`,ATT:`Cristiano Ronaldo 94, Nani 82, Postiga 72, Éder 70`});
S('Rússia',2014,{GK:`Akinfeev 80`,DEF:`V. Berezutski 76, A. Berezutski 74, Ignashevich 74, Kombarov 70, Kozlov 70`,MID:`Shirokov 76, Glushakov 72, Fayzulin 70, Denisov 70`,ATT:`Kerzhakov 74, Samedov 72, Kokorin 74`});
S('Suíça',2014,{GK:`Benaglio 78`,DEF:`Lichtsteiner 78, Rodríguez 76, Djourou 72, Schär 70, von Bergen 70`,MID:`Shaqiri 80, Inler 78, Behrami 76, Dzemaili 76, Xhaka 76`,ATT:`Seferović 74, Mehmedi 72, Drmić 70`});
S('Uruguai',2014,{GK:`Muslera 80`,DEF:`Godín 84, Cáceres 76, Lugano 76, Maxi Pereira 76, Á. Pereira 74`,MID:`Arévalo Ríos 74, C. Rodríguez 72, Gargano 72, Lodeiro 72`,ATT:`Suárez 91, Cavani 86, Forlán 80, Hernández 72`});

// ===== Copa 2010 =====
S('Espanha',2010,{GK:`Casillas 92`,DEF:`Sergio Ramos 88, Piqué 88, Puyol 89, Capdevila 80`,MID:`Busquets 88, Xavi 93, Iniesta 93, Xabi Alonso 87`,ATT:`Villa 90, Torres 86, Pedro 84`});
S('Holanda',2010,{GK:`Stekelenburg 78`,DEF:`van der Wiel 76, Heitinga 76, Mathijsen 74, van Bronckhorst 78, Boulahrouz 72`,MID:`van Bommel 80, de Jong 76, Sneijder 90, Kuyt 80, Elia 74`,ATT:`Robben 91, van Persie 88, Huntelaar 80`});
S('Uruguai',2010,{GK:`Muslera 82`,DEF:`M. Pereira 79, Lugano 83, Godín 82, Fucile 74, Victorino 74`,MID:`Arévalo Ríos 76, Pérez 76, Gargano 76, Lodeiro 74, Álvaro Pereira 74`,ATT:`Forlán 90, Suárez 88, Cavani 84`});

// ===== Copa 2006 =====
S('Inglaterra',2006,{GK:`Robinson 82`,DEF:`G. Neville 80, Ferdinand 86, Terry 87, A. Cole 84, Carragher 80`,MID:`Beckham 85, Lampard 90, Gerrard 90, J. Cole 80, Hargreaves 78`,ATT:`Rooney 88, Crouch 74, Owen 82`});
S('Itália',2006,{GK:`Buffon 92`,DEF:`Zambrotta 87, Cannavaro 94, Materazzi 83, Grosso 84`,MID:`Pirlo 92, Gattuso 85, Camoranesi 83, De Rossi 83`,ATT:`Totti 88, Toni 85, Del Piero 86`});
S('Portugal',2006,{GK:`Ricardo 80`,DEF:`Miguel 78, Ricardo Carvalho 84, Meira 78, Nuno Valente 76, Paulo Ferreira 76`,MID:`Costinha 76, Maniche 80, Deco 86, Figo 88, Petit 74`,ATT:`Cristiano Ronaldo 88, Pauleta 82, Simão 80`});

// ===== Copa 2002 =====
S('Brasil',2002,{GK:`Marcos 84`,DEF:`Cafu 90, Lúcio 86, Roque Júnior 78, Roberto Carlos 90, Edmílson 80`,MID:`Gilberto Silva 82, Kléberson 79, Juninho Paulista 80`,ATT:`Ronaldinho 91, Rivaldo 93, Ronaldo 97`});
S('Coreia do Sul',2002,{GK:`Lee Woon-jae 74`,DEF:`Hong Myung-bo 78, Kim Tae-young 72, Choi Jin-cheul 72, Lee Young-pyo 78, Song Chong-gug 72`,MID:`Park Ji-sung 78, Yoo Sang-chul 74, Kim Nam-il 72, Lee Eul-yong 70`,ATT:`Ahn Jung-hwan 74, Seol Ki-hyeon 72, Hwang Sun-hong 73`});
S('Estados Unidos',2002,{GK:`Friedel 78`,DEF:`Sanneh 70, Berhalter 70, Pope 71, Agoos 68, Hejduk 70`,MID:`Reyna 80, Donovan 78, Beasley 74, O'Brien 72, Stewart 66`,ATT:`McBride 74, Mathis 68, Wolff 70`});
S('Japão',2002,{GK:`Narazaki 70`,DEF:`Matsuda 72, Miyamoto 74, Toda 72, Ichikawa 70, Myojin 68`,MID:`Inamoto 76, Ono 74, Nakata 82, Morishima 72, Alex 70`,ATT:`Suzuki 72, Yanagisawa 70, Takahara 72`});

// ===== Copa 1998 =====
S('Dinamarca',1998,{GK:`Schmeichel 88`,DEF:`Colding 72, Högh 74, Rieper 75, Heintze 74, Helveg 74`,MID:`M. Nielsen 76, Jörgensen 78, Möller 76, Tøfting 72, Schjønberg 72`,ATT:`B. Laudrup 86, Sand 74, Goldbæk 70`});
S('França',1998,{GK:`Barthez 83`,DEF:`Thuram 88, Desailly 90, Blanc 86, Lizarazu 85`,MID:`Deschamps 82, Petit 82, Djorkaeff 86, Zidane 96`,ATT:`Guivarc'h 78, Dugarry 82, Henry 86`});

// ===== Copa 1994 =====
S('Brasil',1994,{GK:`Taffarel 85`,DEF:`Jorginho 80, Aldair 84, Márcio Santos 80, Branco 82`,MID:`Mauro Silva 82, Dunga 80, Mazinho 78, Zinho 79`,ATT:`Bebeto 88, Romário 94, Müller 78`});

// ===== Copa 1990 =====
S('Alemanha',1990,{GK:`Illgner 80`,DEF:`Brehme 86, Kohler 85, Augenthaler 80, Buchwald 84, Berthold 80`,MID:`Matthäus 92, Hässler 82, Littbarski 82, Bein 75, Möller 80`,ATT:`Klinsmann 87, Völler 86, Riedle 78`});
S('Camarões',1990,{GK:`N'Kono 78`,DEF:`Tataw 72, Kunde 70, Ebwelle 68, Massing 68, Pagal 66`,MID:`Makanaky 74, Libih 70, Kana-Biyik 72, Mfede 68, Ndip 66`,ATT:`Milla 80, Omam-Biyik 78, Maboang 70`});

// ===== Copa 1986 =====
S('Argentina',1986,{GK:`Pumpido 77`,DEF:`Brown 78, Ruggeri 79, Cuciuffo 76, Olarticoechea 74`,MID:`Batista 79, Giusti 78, Burruchaga 82, Enrique 80`,ATT:`Maradona 98, Valdano 85, Pasculli 76`});

// ===== Copa 1982 =====
S('Brasil',1982,{GK:`Waldir Peres 76`,DEF:`Leandro 82, Oscar 80, Luizinho 78, Júnior 86`,MID:`Falcão 90, Cerezo 88, Sócrates 92, Zico 94, Paulo Isidoro 74`,ATT:`Serginho 76, Éder 82, Júnior Brasília 70`});
S('Itália',1982,{GK:`Zoff 90`,DEF:`Gentile 86, Scirea 90, Collovati 80, Cabrini 82, Bergomi 78`,MID:`Tardelli 85, Antognoni 84, Oriali 78, Conti 84, Dossena 72`,ATT:`Rossi 90, Graziani 82, Altobelli 82`});

// ===== Copa 1974 =====
S('Alemanha',1974,{GK:`Maier 88`,DEF:`Vogts 85, Beckenbauer 95, Schwarzenbeck 82, Breitner 83`,MID:`Bonhof 80, Overath 84, Hoeness 82`,ATT:`Grabowski 82, G. Müller 92, Hölzenbein 80`});
S('Holanda',1974,{GK:`Jongbloed 76`,DEF:`Suurbier 80, Rijsbergen 80, Krol 85, Haan 82`,MID:`Neeskens 88, Jansen 82, van Hanegem 82`,ATT:`Cruyff 97, Rep 85, Rensenbrink 86`});
S('Polônia',1974,{GK:`Tomaszewski 84`,DEF:`Szymanowski 76, Gorgoń 76, Żmuda 82, Musiał 74`,MID:`Kasperczak 78, Maszczyk 74, Deyna 88, Kapka 72, Cmikiewicz 70`,ATT:`Lato 86, Szarmach 82, Gadocha 78`});

// ===== Copa 1970 =====
S('Brasil',1970,{GK:`Félix 78`,DEF:`Carlos Alberto 88, Brito 80, Piazza 79, Everaldo 79`,MID:`Clodoaldo 84, Gérson 88, Rivellino 90`,ATT:`Jairzinho 90, Tostão 89, Pelé 98, Paulo César 82`});

// ===== Copa 1966 =====
S('Inglaterra',1966,{GK:`Banks 90`,DEF:`Cohen 80, Moore 90, Wilson 80, J. Charlton 82`,MID:`Stiles 80, B. Charlton 92, Ball 83, Peters 82`,ATT:`Hunt 82, Hurst 85, Greaves 84`});
