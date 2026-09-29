/**
 * Missions (docs/06 §7–8). Each mission is data: who gives it, where, what to
 * do and the reward. The tracker listens to game events and reports progress.
 */

import { t } from '../core/i18n';

export type MissionKind = 'notes' | 'seal' | 'split' | 'air' | 'deliver' | 'visit' | 'race' | 'stamps' | 'boost' | 'journey';

export interface MissionDef {
  id: string;
  chapter: string;
  title: string;
  giver: { name: string; district: number; offset: number; side: -1 | 1; look: Partial<import('../models/Human').HumanLook> };
  text: string;
  kind: MissionKind;
  /** Kind-specific parameters. */
  district?: number;
  count?: number;
  time?: number;
  /** Journey: the districts to call at, in order (a long, multi-stop run across the chapter). */
  stops?: number[];
  reward: { ink: number; item?: string };
}

const g = (name: string, district: number, offset: number, side: -1 | 1, look: MissionDef['giver']['look']): MissionDef['giver'] => ({ name, district, offset, side, look });

export const MISSIONS: MissionDef[] = [
  // ——— Chapter 1 · The Sketch ———
  { id: 'sk-bread', chapter: 'sketch', title: 'Warm Bread Run', giver: g('Chef Amara', 0, 40, 1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'beanie', hair: '#2b2622' }), text: 'The ovens are hot and the Tower café is waiting! Deliver this basket to Topsy Terrace before it cools — 60 seconds.', kind: 'deliver', district: 2, time: 60, reward: { ink: 120, item: 'hat:beret' } },
  { id: 'sk-notes', chapter: 'sketch', title: 'Street Symphony', giver: g('Busker Lio', 0, 110, -1, { top: '#3e6fa8', back: 'guitar', hat: 'cap' }), text: 'Play Biscuit Row’s whole tune for me: collect 24 of its notes in one lap.', kind: 'notes', district: 0, count: 24, reward: { ink: 100 } },
  { id: 'sk-air', chapter: 'sketch', title: 'Paper Wings', giver: g('Kite-maker Suri', 0, 200, 1, { top: '#e8559a', topStyle: 'dress', hat: 'sunhat' }), text: 'Show me you can fly! Stay in the air for 1.5 seconds in a single hop.', kind: 'air', time: 1.5, reward: { ink: 90 } },
  { id: 'sk-seal', chapter: 'sketch', title: 'Songbook Pages', giver: g('Postie Nimal', 0, 280, -1, { top: '#d8463a', back: 'satchel', hat: 'cap' }), text: 'The Songbook is missing pages. Seal 6 phrases anywhere in the Sketch.', kind: 'seal', count: 6, reward: { ink: 150, item: 'back:satchel' } },
  { id: 'sk-split', chapter: 'sketch', title: 'Up the Yellow Wall', giver: g('Climber Tess', 1, 8, 1, { top: '#f4d23b', bottomStyle: 'shorts', back: 'backpack' }), text: 'Race up Mustard Tower in under 9 seconds.', kind: 'split', district: 1, time: 9, reward: { ink: 110 } },
  { id: 'sk-race', chapter: 'sketch', title: 'Race the Painter', giver: g('Painter Kiri', 0, 330, 1, { top: '#9a5bd6', hat: 'beret', glasses: 'round' }), text: 'Beat my coupé to the end of Petal Twist. Ready… go!', kind: 'race', district: 3, reward: { ink: 200, item: 'vehicle:coupe' } },
  // ——— Chapter 2 · Serendib ———
  { id: 'sl-isso', chapter: 'serendib', title: 'Isso Vadai Express', giver: g('Aunty Mala', 0, 60, 1, { top: '#f4d23b', topStyle: 'sari', hair: '#2b2622', hairStyle: 'bun' }), text: 'Fresh isso vadai for the Lotus Tower guards! Get there in 45 seconds.', kind: 'deliver', district: 1, time: 45, reward: { ink: 140 } },
  { id: 'sl-kites', chapter: 'serendib', title: 'Kite Festival', giver: g('Kavindu', 0, 180, -1, { top: '#f6f0e4', topStyle: 'shirt', bottomStyle: 'sarong', bottom: '#3e6fa8' }), text: 'The Galle Face kites dropped their tail ribbons on the road. Collect 5 kite stamps!', kind: 'stamps', district: 0, count: 5, reward: { ink: 120, item: 'hat:straw' } },
  { id: 'sl-lotus', chapter: 'serendib', title: 'Round the Lotus', giver: g('Guide Ruwan', 1, 20, 1, { top: '#4f9a5a', hat: 'cap', glasses: 'sun' }), text: 'Spiral up the Lotus Tower in under 30 seconds.', kind: 'split', district: 1, time: 30, reward: { ink: 150 } },
  { id: 'sl-sigiriya', chapter: 'serendib', title: 'The Painted Maidens', giver: g('Artist Nethmi', 2, 30, -1, { top: '#e8559a', topStyle: 'dress', hat: 'sunhat' }), text: 'Walk to the fresco gallery on Sigiriya on foot — park, hop out and visit the lion paws.', kind: 'visit', district: 2, reward: { ink: 130 } },
  { id: 'sl-tea', chapter: 'serendib', title: 'Tea Pluckers’ Song', giver: g('Leela', 3, 30, 1, { top: '#d8463a', topStyle: 'sari', back: 'satchel' }), text: 'Sing along through the tea hills: 20 notes in Ella in one lap.', kind: 'notes', district: 3, count: 20, reward: { ink: 120, item: 'top:sari' } },
  { id: 'sl-train', chapter: 'serendib', title: 'Beat the Blue Train', giver: g('Station master Dilan', 4, 10, -1, { top: '#2f5aa8', topStyle: 'shirt', hat: 'cap' }), text: 'Cross the Nine Arch Bridge ahead of the train — race to Mirissa!', kind: 'race', district: 4, reward: { ink: 220, item: 'vehicle:tuktuk' } },
  // ——— Chapter 3 · Wonders ———
  { id: 'w-wall', chapter: 'wonders', title: 'Watchtower Relay', giver: g('Guard Mei', 0, 30, 1, { top: '#d8463a', hat: 'cap' }), text: 'Carry the signal flag along the Great Wall to the Colosseum in 40 seconds.', kind: 'deliver', district: 1, time: 40, reward: { ink: 160 } },
  { id: 'w-colosseum', chapter: 'wonders', title: 'Lap of Honour', giver: g('Marcus', 1, 20, -1, { top: '#f6f0e4', topStyle: 'dress', hair: '#6b4a2a' }), text: 'The crowd wants a show: boost for 3 seconds in total inside the Colosseum.', kind: 'boost', district: 1, time: 3, reward: { ink: 140 } },
  { id: 'w-taj', chapter: 'wonders', title: 'Reflections', giver: g('Priya', 2, 30, 1, { top: '#9a5bd6', topStyle: 'sari', glasses: 'round' }), text: 'Seal 3 phrases around the Taj Mahal garden and beyond.', kind: 'seal', count: 3, reward: { ink: 150, item: 'glasses:round' } },
  { id: 'w-machu', chapter: 'wonders', title: 'Llama Lookout', giver: g('Quilla', 3, 20, -1, { top: '#f08a2e', hat: 'beanie', back: 'backpack' }), text: 'Walk up to the citadel on foot and say hello to the llamas.', kind: 'visit', district: 3, reward: { ink: 140 } },
  { id: 'w-rio', chapter: 'wonders', title: 'Arms Wide Open', giver: g('Joana', 4, 20, 1, { top: '#4f9a5a', bottomStyle: 'shorts', hat: 'sunhat' }), text: 'Launch a 2-second hop somewhere in Rio. Fly like the statue!', kind: 'air', time: 2, reward: { ink: 170, item: 'vehicle:buggy' } },
  { id: 'w-petra', chapter: 'wonders', title: 'The Treasury Run', giver: g('Omar', 6, 20, -1, { top: '#c8955a', topStyle: 'shirt', hat: 'none' }), text: 'Race me through the Siq and past the Treasury!', kind: 'race', district: 6, reward: { ink: 250, item: 'vehicle:van' } },
  // ——— Chapter 4 · Lantern Roads ———
  { id: 'l-fox', chapter: 'lanterns', title: 'Fox Messenger', giver: g('Priestess Aiko', 0, 30, 1, { top: '#f6f0e4', topStyle: 'dress', bottom: '#d8463a', hair: '#2b2622', hairStyle: 'bun' }), text: 'Carry this prayer through all the gates and into the bamboo grove in 35 seconds.', kind: 'deliver', district: 1, time: 35, reward: { ink: 170 } },
  { id: 'l-bamboo', chapter: 'lanterns', title: 'Whispering Canes', giver: g('Flautist Ren', 1, 30, -1, { top: '#5c9a32', hat: 'straw' }), text: 'The grove hums a tune. Collect 20 of its notes in one lap.', kind: 'notes', district: 1, count: 20, reward: { ink: 150 } },
  { id: 'l-halong', chapter: 'lanterns', title: 'Dragon’s Back', giver: g('Captain Linh', 2, 40, 1, { top: '#3e6fa8', topStyle: 'shirt', hat: 'cap' }), text: 'Race my junk across the bay — beat me to Hội An!', kind: 'race', district: 2, reward: { ink: 240, item: 'glow:pink' } },
  { id: 'l-lanterns', chapter: 'lanterns', title: 'Light the Street', giver: g('Lantern-maker Mai', 3, 30, -1, { top: '#f4a13b', topStyle: 'dress', hat: 'sunhat' }), text: 'Seal 4 phrases between the lantern street and the mountains.', kind: 'seal', count: 4, reward: { ink: 160, item: 'hat:flowers' } },
  { id: 'l-pass', chapter: 'lanterns', title: 'Over the Pass', giver: g('Sherpa Dawa', 4, 20, 1, { top: '#d8463a', hat: 'beanie', back: 'backpack' }), text: 'Climb the Himalayan switchbacks in under 40 seconds.', kind: 'split', district: 4, time: 40, reward: { ink: 200 } },
  { id: 'l-wave', chapter: 'lanterns', title: 'Ride the Curl', giver: g('Surfer Kai', 5, 20, -1, { top: '#3e86c9', bottomStyle: 'shorts', glasses: 'sun' }), text: 'Boost for 4 seconds in total while riding the Great Wave.', kind: 'boost', district: 5, time: 4, reward: { ink: 220, item: 'glow:green' } },
  { id: 'p-felucca', chapter: 'postcards', title: 'Beat the Felucca', giver: g('Boatman Karim', 0, 40, 1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'straw', skin: '#b27b52' }), text: 'My sail is quick on the wind — race me up the Nile to Santorini!', kind: 'race', district: 0, reward: { ink: 220, item: 'roof:kayak' } },
  { id: 'p-postcard', chapter: 'postcards', title: 'Postcard Rush', giver: g('Postmistress Eleni', 1, 30, -1, { top: '#2d6fb7', topStyle: 'dress', hair: '#2b2622', hairStyle: 'bun' }), text: 'Get these postcards from Santorini to the Kyoto lanes in 40 seconds.', kind: 'deliver', district: 2, time: 40, reward: { ink: 190 } },
  { id: 'p-lanes', chapter: 'postcards', title: 'Lantern Lanes', giver: g('Maiko Hana', 2, 30, 1, { top: '#b0352a', topStyle: 'dress', hair: '#2b2622', hairStyle: 'bun', acc: 'flower' }), text: 'The night lanes are full of music. Collect 18 notes in Kyoto in one lap.', kind: 'notes', district: 2, count: 18, reward: { ink: 160, item: 'roof:lanterns' } },
  { id: 'p-lake', chapter: 'postcards', title: 'Round the Lake', giver: g('Drummer Sunil', 3, 20, -1, { top: '#f6f0e4', topStyle: 'national', bottom: '#f6f0e4', bottomStyle: 'sarong', hat: 'natcap' }), text: 'Drive the whole curve round Kandy Lake in under 30 seconds, rain and all.', kind: 'split', district: 3, time: 30, reward: { ink: 200 } },
  { id: 'p-tea', chapter: 'postcards', title: 'Monsoon Tea', giver: g('Tea-picker Malini', 4, 30, 1, { top: '#e8559a', topStyle: 'sari', back: 'satchel' }), text: 'Seal 3 phrases between Kandy and the Ella Gap.', kind: 'seal', count: 3, reward: { ink: 170, item: 'wheels:whitewall' } },
  { id: 'p-gap', chapter: 'postcards', title: 'Jump the Gap', giver: g('Guide Nuwan', 4, 60, -1, { top: '#4f9a5a', bottomStyle: 'shorts', hat: 'cap', back: 'backpack' }), text: 'Boost for 5 seconds in total on the road to the Ella Gap.', kind: 'boost', district: 4, time: 5, reward: { ink: 210 } },
  // ——— Chapter 6 · City Lights ———
  { id: 'cl-croissant', chapter: 'citylights', title: 'Warm Croissants', giver: g('Baker Élodie', 0, 40, -1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'beret', hair: '#6b3f2a' }), text: 'Fresh from the oven! Get these croissants from Paris to a café in London in 50 seconds.', kind: 'deliver', district: 1, time: 50, reward: { ink: 200, item: 'hat:beret' } },
  { id: 'cl-bus', chapter: 'citylights', title: 'Beat the Bus', giver: g('Conductor Alfie', 1, 30, 1, { top: '#b0352a', hat: 'cap' }), text: 'The number 11 waits for no one. Race me along the Thames to Venice!', kind: 'race', district: 1, reward: { ink: 220 } },
  { id: 'cl-gondola', chapter: 'citylights', title: 'Gondolier’s Song', giver: g('Gondolier Marco', 2, 20, -1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'straw' }), text: 'Help me sing: collect 16 notes along the canal in Venice in one lap.', kind: 'notes', district: 2, count: 16, reward: { ink: 170, item: 'hat:straw' } },
  { id: 'cl-tulips', chapter: 'citylights', title: 'Through the Tulips', giver: g('Grower Anouk', 3, 60, 1, { top: '#f08a2e', bottomStyle: 'shorts', hat: 'sunhat' }), text: 'Drive the whole of Amsterdam, canals and tulips, in under 45 seconds.', kind: 'split', district: 3, time: 45, reward: { ink: 200 } },
  { id: 'cl-gaudi', chapter: 'citylights', title: 'Broken Tiles', giver: g('Artist Pau', 4, 30, -1, { top: '#3e86c9', topStyle: 'shirt', glasses: 'round' }), text: 'Gaudí made beauty from broken tiles. Seal 4 phrases between Barcelona and Istanbul.', kind: 'seal', count: 4, reward: { ink: 190, item: 'glasses:round' } },
  { id: 'cl-dunes', chapter: 'citylights', title: 'Dune Flyer', giver: g('Guide Rashid', 6, 40, 1, { top: '#f6f0e4', topStyle: 'shirt', skin: '#b27b52' }), text: 'Boost for 6 seconds in total on the long desert road to the tallest tower.', kind: 'boost', district: 6, time: 6, reward: { ink: 230 } },
  // ——— Chapter 7 · Skylines ———
  { id: 'sy-cab', chapter: 'skylines', title: 'Yellow Cab Rush', giver: g('Cabbie Rosa', 0, 30, 1, { top: '#f4d23b', hat: 'cap', hair: '#2b2622' }), text: 'My fare’s late for a show! Get them across Manhattan to the Golden Gate in 45 seconds.', kind: 'deliver', district: 1, time: 45, reward: { ink: 220 } },
  { id: 'sy-hills', chapter: 'skylines', title: 'Hill Hopper', giver: g('Skater Jay', 1, 20, -1, { top: '#e8559a', bottomStyle: 'shorts', hat: 'beanie' }), text: 'These hills were made for flying. Stay in the air for 1.2 seconds in a single hop.', kind: 'air', district: 1, time: 1.2, reward: { ink: 210, item: 'glow:pink' } },
  { id: 'sy-bridge', chapter: 'skylines', title: 'Across the Gate', giver: g('Painter Mei', 1, 200, 1, { top: '#b0352a', topStyle: 'shirt', back: 'satchel' }), text: 'Race me across the Golden Gate and down to Copacabana!', kind: 'race', district: 1, reward: { ink: 240 } },
  { id: 'sy-samba', chapter: 'skylines', title: 'Samba Beat', giver: g('Drummer Tiago', 2, 40, -1, { top: '#5dbb3f', bottomStyle: 'shorts', hat: 'straw' }), text: 'Keep the carnival going: collect 20 notes along the beach in Rio in one lap.', kind: 'notes', district: 2, count: 20, reward: { ink: 180 } },
  { id: 'sy-neon', chapter: 'skylines', title: 'Neon Dash', giver: g('Gamer Yui', 3, 30, 1, { top: '#9a5bd6', hair: '#2b2622', hairStyle: 'bun' }), text: 'Drive through Tokyo, crossing and all, in under 30 seconds.', kind: 'split', district: 3, time: 30, reward: { ink: 200, item: 'glow:green' } },
  { id: 'sy-harbour', chapter: 'skylines', title: 'Harbour Lights', giver: g('Ferry Captain Ada', 5, 20, -1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'cap' }), text: 'Seal 4 phrases between Singapore and the Sydney Opera House.', kind: 'seal', count: 4, reward: { ink: 200 } },
  // ——— Chapter 8 · Island Road Trip ———
  { id: 'it-tuk', chapter: 'islandtrip', title: 'Pettah Tuk-tuk', giver: g('Driver Ruwan', 0, 30, 1, { top: '#3e6fa8', topStyle: 'shirt', bottomStyle: 'sarong', bottom: '#2d4f8f' }), text: 'Race my tuk-tuk out of Colombo and up to the Kandy hills!', kind: 'race', district: 0, reward: { ink: 200, item: 'vehicle:tuktuk' } },
  { id: 'it-drums', chapter: 'islandtrip', title: 'Perahera Drums', giver: g('Drummer Chaminda', 1, 30, -1, { top: '#f6f0e4', topStyle: 'national', bottom: '#f6f0e4', bottomStyle: 'sarong' }), text: 'Keep time with the drums: collect 18 notes alongside the parade in Kandy.', kind: 'notes', district: 1, count: 18, reward: { ink: 170 } },
  { id: 'it-post', chapter: 'islandtrip', title: 'Hill Country Post', giver: g('Postman Sunil', 2, 30, 1, { top: '#d8463a', back: 'satchel', hat: 'cap' }), text: 'Take the mail from the Nuwara Eliya post office down to Ella in 50 seconds.', kind: 'deliver', district: 3, time: 50, reward: { ink: 210, item: 'back:satchel' } },
  { id: 'it-hairpins', chapter: 'islandtrip', title: 'Hairpin Heaven', giver: g('Rally Dilini', 2, 90, -1, { top: '#f4d23b', hat: 'cap' }), text: 'Drive the hairpins of Nuwara Eliya in under 40 seconds.', kind: 'split', district: 2, time: 40, reward: { ink: 220 } },
  { id: 'it-leopard', chapter: 'islandtrip', title: 'Leopard Spotting', giver: g('Ranger Kasun', 4, 40, 1, { top: '#6b7a3f', bottomStyle: 'shorts', hat: 'sunhat' }), text: 'Seal 4 phrases on the safari track through Yala. Quietly now!', kind: 'seal', count: 4, reward: { ink: 190, item: 'hat:straw' } },
  { id: 'it-surf', chapter: 'islandtrip', title: 'Sunset at the Fort', giver: g('Surfer Tharushi', 5, 30, -1, { top: '#3e86c9', bottomStyle: 'shorts', acc: 'flower' }), text: 'Boost for 5 seconds in total on the coast road round Galle Fort before sunset.', kind: 'boost', district: 5, time: 5, reward: { ink: 230, item: 'hat:flowers' } },
  // ——— Grand Tour · Great Britain ———
  { id: 'gb-mail', chapter: 'britain', title: 'Royal Mail Run', giver: g('Postie Morag', 0, 60, 1, { top: '#d8263a', back: 'satchel', hat: 'cap', hair: '#b5652e' }), text: 'The last post of the day goes the length of the country! Call at York, Bath, Cornwall and Brighton, in that order. Take your time: it is a long road.', kind: 'journey', stops: [3, 5, 7, 9], reward: { ink: 600, item: 'wheels:whitewall' } },
  { id: 'gb-haggis', chapter: 'britain', title: 'Haggis Express', giver: g('Chef Hamish', 0, 140, -1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'beanie', hair: '#b5652e' }), text: 'A hot haggis for the ceilidh up in the glen! Get it to the Highlands in 70 seconds.', kind: 'deliver', district: 1, time: 70, reward: { ink: 200, item: 'hat:beanie' } },
  { id: 'gb-pipes', chapter: 'britain', title: 'Bagpipe Tune', giver: g('Piper Iona', 1, 50, 1, { top: '#2d6a4f', topStyle: 'dress', bottom: '#8a2a2a', hat: 'beret' }), text: 'The glen has a long tune in it. Collect 30 of the Highlands’ notes in one lap.', kind: 'notes', district: 1, count: 30, reward: { ink: 220, item: 'horn:trumpet' } },
  { id: 'gb-pass', chapter: 'britain', title: 'Hardknott Pass', giver: g('Fell-runner Wyn', 2, 40, -1, { top: '#f4d23b', bottomStyle: 'shorts', back: 'backpack' }), text: 'Drive the whole Lake District road, round both lake bends, in under 45 seconds.', kind: 'split', district: 2, time: 45, reward: { ink: 240 } },
  { id: 'gb-fete', chapter: 'britain', title: 'Village Fête', giver: g('Vicar Pru', 4, 40, 1, { top: '#6a4a8a', topStyle: 'dress', hat: 'sunhat', glasses: 'round' }), text: 'The bunting blew off the fête stalls! Collect 6 bunting stamps along the Cotswold lanes.', kind: 'stamps', district: 4, count: 6, reward: { ink: 210, item: 'roof:flowers' } },
  { id: 'gb-stones', chapter: 'britain', title: 'Midsummer Stones', giver: g('Druid Bryn', 6, 40, -1, { top: '#f6f0e4', topStyle: 'dress', bottom: '#f6f0e4', hat: 'none', hair: '#dcdcdc' }), text: 'Park the car and walk out to the stones on foot. Stand in the ring at sunset.', kind: 'visit', district: 6, reward: { ink: 200 } },
  { id: 'gb-coast', chapter: 'britain', title: 'Cornish Coast Race', giver: g('Surfer Kerensa', 7, 30, 1, { top: '#3e86c9', bottomStyle: 'shorts', glasses: 'sun' }), text: 'Race my buggy along the coast road, over the headland, to the harbour!', kind: 'race', district: 7, reward: { ink: 280, item: 'roof:surfboard' } },
  { id: 'gb-pier', chapter: 'britain', title: 'Pier Pressure', giver: g('Busker Dev', 9, 40, -1, { top: '#e8559a', topStyle: 'shirt', back: 'guitar', hat: 'straw' }), text: 'Brighton loves a show! Boost for 6 seconds in total along the seafront.', kind: 'boost', district: 9, time: 6, reward: { ink: 260, item: 'glasses:sun' } },
  // ——— Grand Tour · Japan ———
  { id: 'jp-bento', chapter: 'japan', title: 'The Ekiben Run', giver: g('Station chef Haruto', 0, 60, 1, { top: '#f6f0e4', topStyle: 'shirt', hat: 'chef', hair: '#2b2622' }), text: 'Station lunch boxes for every stop on the line! Call at Kyoto, Osaka, Miyajima and Okinawa, in that order. Keep them warm, it is a long way.', kind: 'journey', stops: [3, 5, 7, 9], reward: { ink: 600, item: 'pet:crane' } },
  { id: 'jp-shibuya', chapter: 'japan', title: 'Scramble!', giver: g('Idol Mika', 0, 180, -1, { top: '#e8559a', topStyle: 'dress', hat: 'catears', hair: '#2b2622' }), text: 'The crossing is the stage! Boost for 5 seconds in total through Tokyo’s neon.', kind: 'boost', district: 0, time: 5, reward: { ink: 220, item: 'hat:catears' } },
  { id: 'jp-fuji', chapter: 'japan', title: 'Fuji Pass', giver: g('Climber Kenji', 1, 30, 1, { top: '#d8463a', hat: 'beanie', back: 'backpack' }), text: 'Over the pass beside Lake Ashi and down again: drive all of Hakone in under 50 seconds.', kind: 'split', district: 1, time: 50, reward: { ink: 240 } },
  { id: 'jp-gates', chapter: 'japan', title: 'A Thousand Gates', giver: g('Priestess Sakura', 3, 30, -1, { top: '#f6f0e4', topStyle: 'dress', bottom: '#d8463a', hair: '#2b2622', hairStyle: 'bun' }), text: 'The foxes lost their bells among the torii. Collect 6 bell stamps in Kyoto.', kind: 'stamps', district: 3, count: 6, reward: { ink: 220, item: 'pet:fox' } },
  { id: 'jp-deer', chapter: 'japan', title: 'Deer Crackers', giver: g('Ranger Aoi', 4, 40, 1, { top: '#6b7a3f', bottomStyle: 'shorts', hat: 'sunhat' }), text: 'Park the car and walk to the Great Buddha Hall. Mind the deer, they bow for crackers!', kind: 'visit', district: 4, reward: { ink: 200 } },
  { id: 'jp-osaka', chapter: 'japan', title: 'Kuidaore', giver: g('Takoyaki Taro', 5, 40, -1, { top: '#f4d23b', topStyle: 'shirt', hat: 'headband' }), text: 'In Osaka we eat until we drop! Grab 30 notes along Dōtonbori in one lap.', kind: 'notes', district: 5, count: 30, reward: { ink: 230, item: 'roof:lanterns' } },
  { id: 'jp-heron', chapter: 'japan', title: 'Race the Heron', giver: g('Samurai Ren', 6, 40, 1, { top: '#3e3a5a', topStyle: 'jacket', hat: 'none', hair: '#2b2622', hairStyle: 'topknot' }), text: 'Race my buggy under the blossom round the White Heron castle!', kind: 'race', district: 6, reward: { ink: 280, item: 'glow:pink' } },
  { id: 'jp-onsen', chapter: 'japan', title: 'Hot Bath Delivery', giver: g('Innkeeper Yumi', 7, 60, -1, { top: '#2f5aa8', topStyle: 'dress', hair: '#2b2622', hairStyle: 'bun' }), text: 'Fresh towels for the ryokan in Beppu! Get there in 75 seconds before the bath goes cold.', kind: 'deliver', district: 8, time: 75, reward: { ink: 220, item: 'hat:helmet' } },
];

export function missionsFor(chapter: string): MissionDef[] {
  return MISSIONS.filter((m) => m.chapter === chapter);
}

export interface MissionStatus {
  mission: MissionDef;
  label: string;
  progress: number;
  goal: number;
  timeLeft: number | null;
  failed: boolean;
  done: boolean;
}

/**
 * Tracks the one active mission. The game feeds it events; it answers with a
 * status line for the HUD and flips `done` or `failed`.
 */
export class MissionTracker {
  active: MissionStatus | null = null;
  /** For deliveries and races: has the run started? */
  started = false;

  start(m: MissionDef): void {
    const goal = m.kind === 'journey' ? m.stops?.length ?? 1 : m.kind === 'visit' || m.kind === 'deliver' || m.kind === 'race' || m.kind === 'split' || m.kind === 'air' ? 1 : m.kind === 'boost' ? m.time ?? 3 : m.count ?? 1;
    this.active = { mission: m, label: m.title, progress: 0, goal, timeLeft: m.kind === 'deliver' ? m.time ?? 60 : null, failed: false, done: false };
    this.started = m.kind !== 'race';
  }

  cancel(): void {
    this.active = null;
    this.started = false;
  }

  private bump(amount = 1): void {
    const a = this.active;
    if (!a || a.done || a.failed) return;
    a.progress = Math.min(a.goal, a.progress + amount);
    if (a.progress >= a.goal) a.done = true;
  }

  onNote(district: number): void {
    const a = this.active;
    if (a?.mission.kind === 'notes' && a.mission.district === district) this.bump();
  }

  onSeal(): void {
    if (this.active?.mission.kind === 'seal') this.bump();
  }

  onStamp(): void {
    if (this.active?.mission.kind === 'stamps') this.bump();
  }

  onAir(seconds: number): void {
    const a = this.active;
    if (a?.mission.kind === 'air' && seconds >= (a.mission.time ?? 1)) this.bump();
  }

  onSplit(district: number, time: number): void {
    const a = this.active;
    if (a?.mission.kind === 'split' && a.mission.district === district) {
      if (time <= (a.mission.time ?? 10)) this.bump();
      else a.label = t('mis.retry', { title: a.mission.title, time: time.toFixed(1) });
    }
  }

  onEnterDistrict(district: number): void {
    const a = this.active;
    if (a?.mission.kind === 'deliver' && district === a.mission.district) this.bump();
    // Journeys call at their stops in order.
    if (a?.mission.kind === 'journey' && !a.done && a.mission.stops?.[Math.floor(a.progress)] === district) this.bump();
  }

  /** Journey: the next district to call at (null when there is none). */
  nextStop(): number | null {
    const a = this.active;
    if (a?.mission.kind !== 'journey' || a.done || a.failed) return null;
    return a.mission.stops?.[Math.floor(a.progress)] ?? null;
  }

  /** Put a saved journey back where it was (Continue after closing the game). */
  resume(m: MissionDef, progress: number): void {
    this.start(m);
    if (this.active) this.active.progress = Math.max(0, Math.min(this.active.goal - 1, Math.floor(progress)));
  }

  /** Names for the journey's stops (set by the game from the chapter's districts). */
  stopName: ((district: number) => string) | null = null;
  /** Road distance to the next stop in metres (kept up to date by the game), or null. */
  stopDistance: number | null = null;

  onBoost(district: number, dt: number): void {
    const a = this.active;
    if (a?.mission.kind === 'boost' && a.mission.district === district) this.bump(dt);
  }

  onVisit(): void {
    if (this.active?.mission.kind === 'visit') this.bump();
  }

  /** Race: `playerAhead` once the rival or player crosses the district end. */
  onRaceFinish(playerWon: boolean): void {
    const a = this.active;
    if (a?.mission.kind !== 'race') return;
    if (playerWon) this.bump();
    else a.failed = true;
  }

  tick(dt: number): void {
    const a = this.active;
    if (!a || a.done || a.failed || a.timeLeft === null) return;
    a.timeLeft -= dt;
    if (a.timeLeft <= 0) {
      a.timeLeft = 0;
      a.failed = true;
    }
  }

  statusText(): string {
    const a = this.active;
    if (!a) return '';
    if (a.done) return `✓ ${t('mis.complete', { title: a.mission.title })}`;
    if (a.failed) return `✗ ${t('mis.failed', { title: a.mission.title, name: a.mission.giver.name })}`;
    const bits: string[] = [a.label];
    if (a.goal > 1 && a.mission.kind !== 'boost') bits.push(`${Math.floor(a.progress)}/${a.goal}`);
    if (a.mission.kind === 'boost') bits.push(`${a.progress.toFixed(1)}/${a.goal}s`);
    if (a.timeLeft !== null) bits.push(t('mis.left', { n: a.timeLeft.toFixed(0) }));
    if (a.mission.kind === 'race' && !this.started) bits.push(t('mis.driveToStart'));
    const next = this.nextStop();
    if (next !== null && this.stopName) {
      const d = this.stopDistance;
      bits.push(t('mis.nextStop', { place: this.stopName(next) }) + (d !== null && d > 0 ? ` ${d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d / 10) * 10} m`}` : ''));
    }
    return bits.join(' · ');
  }
}
