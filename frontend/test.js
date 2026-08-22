import Fuse from "fuse.js";

let text = 'Bebek ria';


const table = ['Nasi', 'Ayam', 'Ikan', "IKN", "Bebek", "Bebek Rica"]


const fuzzySearch = new Fuse(table, {
  includeScore: true,
  threshold: 0.5
})

const result = fuzzySearch.search(text);


for (const item of result) {
    let confidence = (1 - item.score) * 100
    console.log(`Item Kamu ${item.item} dengan kepedean ${confidence.toPrecision(4)}%`)
}