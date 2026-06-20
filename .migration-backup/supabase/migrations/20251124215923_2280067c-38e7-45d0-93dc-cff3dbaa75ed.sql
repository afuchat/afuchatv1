-- Update gift names to be more descriptive for AI image generation

-- Common gifts
UPDATE gifts SET name = 'Colorful Wrapped Candy' WHERE emoji = '🍬' AND rarity = 'common';
UPDATE gifts SET name = 'Sweet Lollipop Candy' WHERE emoji = '🍭' AND rarity = 'common';
UPDATE gifts SET name = 'Soft Kitten Plush Toy' WHERE emoji = '🐱' AND rarity = 'common';
UPDATE gifts SET name = 'Emoji Decorative Pillow' WHERE emoji = '🛏️' AND rarity = 'common';
UPDATE gifts SET name = 'Wrapped Gift Box with Bow' WHERE emoji = '🎁' AND name = 'Free Emoji Gift Box';
UPDATE gifts SET name = 'Red Heart Shape' WHERE emoji = '❤️' AND rarity = 'common';
UPDATE gifts SET name = 'Laughing Face Emoji Keychain' WHERE emoji = '😂' AND rarity = 'common';
UPDATE gifts SET name = 'Party Celebration Confetti' WHERE emoji = '🎉' AND rarity = 'common';
UPDATE gifts SET name = 'Pizza Slice on Plate' WHERE emoji = '🍕' AND rarity = 'common';
UPDATE gifts SET name = 'Red Rose Flower' WHERE emoji = '🌹' AND rarity = 'common';
UPDATE gifts SET name = 'Smartphone Sticker Collection' WHERE emoji = '📱' AND rarity = 'common';

-- Uncommon gifts
UPDATE gifts SET name = 'Ceramic Coffee Mug' WHERE emoji = '☕' AND rarity = 'uncommon';
UPDATE gifts SET name = 'Canvas Tote Shopping Bag' WHERE emoji = '👜' AND rarity = 'uncommon';
UPDATE gifts SET name = 'Heart Pattern Clutch Purse' WHERE emoji = '👛' AND rarity = 'uncommon';
UPDATE gifts SET name = 'Stylish Sneakers Shoes' WHERE emoji = '👟' AND rarity = 'uncommon';
UPDATE gifts SET name = 'Colorful Flower Bouquet' WHERE emoji = '💐' AND rarity = 'uncommon';
UPDATE gifts SET name = 'Carved Halloween Pumpkin' WHERE emoji = '🎃' AND rarity = 'uncommon';
UPDATE gifts SET name = 'Mini Zen Garden Plants' WHERE emoji = '🪴' AND rarity = 'uncommon';

-- Rare gifts
UPDATE gifts SET name = 'Decorated Birthday Cake' WHERE emoji = '🎂' AND rarity = 'rare';
UPDATE gifts SET name = 'Luxury Chocolate Gift Box' WHERE emoji = '🍫' AND rarity = 'rare';
UPDATE gifts SET name = 'Decorated Christmas Pine Tree' WHERE emoji = '🎄' AND name = 'Christmas Tree';
UPDATE gifts SET name = 'Glass Christmas Tree Ornament' WHERE emoji = '🎄' AND name = 'Christmas Tree Ornament';
UPDATE gifts SET name = 'Galaxy Pattern Soft Blanket' WHERE emoji = '🌌' AND rarity = 'rare';
UPDATE gifts SET name = 'Video Game Controller Accessory' WHERE emoji = '🎮' AND rarity = 'rare';
UPDATE gifts SET name = 'Glowing Ghost Spirit' WHERE emoji = '👻' AND rarity = 'rare';
UPDATE gifts SET name = 'Elegant Wrapped Gift Box' WHERE emoji = '🎁' AND name = 'Gift Box';
UPDATE gifts SET name = 'Sealed Love Letter Envelope' WHERE emoji = '💌' AND rarity = 'rare';
UPDATE gifts SET name = 'Fortune Teller Crystal Ball' WHERE emoji = '🎱' AND rarity = 'rare';
UPDATE gifts SET name = 'Orange Halloween Pumpkin Lantern' WHERE emoji = '🎃' AND name = 'Pumpkin';
UPDATE gifts SET name = 'Winter Snowman Figure' WHERE emoji = '⛄' AND rarity = 'rare';
UPDATE gifts SET name = 'Romantic Valentine Red Rose' WHERE emoji = '🌹' AND name = 'Valentine Rose';

-- Epic gifts
UPDATE gifts SET name = 'Glowing Lightsaber Energy Sword' WHERE emoji = '⚔️' AND rarity = 'epic';
UPDATE gifts SET name = 'Superhero Cape and Mask' WHERE emoji = '🦸' AND rarity = 'epic';

-- Legendary gifts
UPDATE gifts SET name = 'Sparkling Diamond Gemstone' WHERE emoji = '💎' AND rarity = 'legendary';
UPDATE gifts SET name = 'Mystical Fortune Crystal Ball' WHERE emoji = '🔮' AND rarity = 'legendary';
UPDATE gifts SET name = 'Rainbow Unicorn Magical Plush' WHERE emoji = '🦄' AND rarity = 'legendary';
UPDATE gifts SET name = 'Santa Claus Red Hat' WHERE emoji = '🎅' AND rarity = 'legendary';
UPDATE gifts SET name = 'Golden Victory Trophy Cup' WHERE emoji = '🏆' AND rarity = 'legendary';