// Baza artikala
const artikli = [
    {
        id: 1,
        naziv: "Vintage ljetna haljina",
        kategorija: "haljine",
        velicina: "S",
        cijena: 25.99,
        slika: "vintage.png",
        opis: "Predivna ljetna haljina s cvjetnim uzorkom iz '70-ih. Lagana i prozračna, idealna za tople ljetne dane. Očuvana i u odličnom stanju bez oštećenja.",
        omiljeni: false
    },
    {
        id: 2,
        naziv: "Retro sako s upečatljivim detaljima",
        kategorija: "sakoi",
        velicina: "L",
        cijena: 34.99,
        slika: "vintage.png",
        opis: "Elegantni sako iz '90-ih s jedinstvenim detaljima koji će svaki outfit učiniti posebnim. Blago strukiran, s klasičnim krojem i odlično očuvanim šavovima. Idealan za poslovne i svečane prilike.",
        omiljeni: false
    },
    {
        id: 3,
        naziv: "Klasične traperice visokog struka",
        kategorija: "jeans",
        velicina: "M",
        cijena: 29.99,
        slika: "vintage.png",
        opis: "Autentične traperice visokog struka iz '80-ih. Savršeno pristaju i ističu figuru. Traperice su u odličnom stanju, s minimalnim znakovima nošenja, što im daje autentičan vintage izgled.",
        omiljeni: false
    },
    {
        id: 4,
        naziv: "Oversized košulja s printom",
        kategorija: "kosulje",
        velicina: "XL",
        cijena: 19.99,
        slika: "vintage.png",
        opis: "Prostrana, udobna košulja s upečatljivim printom koji privlači poglede. Mogu je nositi osobe različitih konstitucija, a posebno dobro izgleda u casual kombinacijama. Materijal je mekan i ugodan za nošenje.",
        omiljeni: false
    }
];

// Funkcija za čuvanje artikala u lokalnom skladištu
function sacuvajArtikle() {
    localStorage.setItem('artikli', JSON.stringify(artikli));
}

// Funkcija za učitavanje artikala iz lokalnog skladišta
function ucitajArtikle() {
    const spremljeniArtikli = localStorage.getItem('artikli');
    return spremljeniArtikli ? JSON.parse(spremljeniArtikli) : artikli;
}

// Funkcija za čuvanje košarice
function sacuvajKorpu(korpa) {
    localStorage.setItem('korpa', JSON.stringify(korpa));
}

// Funkcija za učitavanje košarice
function ucitajKorpu() {
    const spremljenaKorpa = localStorage.getItem('korpa');
    return spremljenaKorpa ? JSON.parse(spremljenaKorpa) : [];
}

// Funkcija za čuvanje omiljenih artikala
function sacuvajOmiljene(omiljeni) {
    localStorage.setItem('omiljeni', JSON.stringify(omiljeni));
}

// Funkcija za učitavanje omiljenih artikala
function ucitajOmiljene() {
    const spremljeniOmiljeni = localStorage.getItem('omiljeni');
    return spremljeniOmiljeni ? JSON.parse(spremljeniOmiljeni) : [];
}
