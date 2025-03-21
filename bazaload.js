document.addEventListener('DOMContentLoaded', () => {
    console.log("Stranica učitana!");
    
    // Provjera na kojoj smo stranici
    const naIndexStranici = window.location.pathname.includes('index.html') || 
                           window.location.pathname.endsWith('/') || 
                           window.location.pathname.endsWith('/vintage.thrift/');
    const naProizvodStranici = window.location.pathname.includes('proizvod.html');
    const naFavoritiStranici = window.location.pathname.includes('favorites.html');
    const naKorpaStranici = window.location.pathname.includes('cart.html');
    
    if (naIndexStranici) {
        // Prikaz svih artikala na početnoj stranici
        prikaziArtikleNaPocetnoj(artikli);
        
        // Postavljanje događaja za filtere
        postaviFiltere();
    } 
    else if (naProizvodStranici) {
        // Prikaz detalja proizvoda
        prikaziDetaljeProizvoda();
    }
    else if (naFavoritiStranici) {
        // Prikaz omiljenih artikala
        prikaziFavorite();
    }
    else if (naKorpaStranici) {
        // Prikaz artikala u korpi
        prikaziKorpu();
    }
});

// Funkcija za prikaz artikala na početnoj stranici
function prikaziArtikleNaPocetnoj(artikliZaPrikaz) {
    const kontejner = document.getElementById('products-container');
    if (!kontejner) {
        console.error("Container za proizvode nije pronađen!");
        return;
    }
    
    // Očisti kontejner
    kontejner.innerHTML
