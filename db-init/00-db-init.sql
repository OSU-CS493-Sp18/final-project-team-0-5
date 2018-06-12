-- Data definition queries for the Dungeons and Dragons Database
-- By Eli Laudi

DROP TABLE IF EXISTS spells;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS schools;
DROP TABLE IF EXISTS attributes;
DROP TABLE IF EXISTS class_spells;

-- Table definitions

--
-- Table structure for table 'spells'
--

CREATE TABLE spells (
	id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
	userid char(24) NOT NULL,
	name varchar(50) NOT NULL,
	school_fid int(11)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table 'classes'
--

CREATE TABLE classes (
	id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name varchar(50) NOT NULL,
	primary_attribute_fid int(11) NOT NULL,
	save_attribute_one_fid int(11) NOT NULL,
	save_attribute_two_fid int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table 'schools'
--

CREATE TABLE schools (
	id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name varchar(50) NOT NULL,
	description varchar(2000) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table 'attributes'
--

CREATE TABLE attributes (
	id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name varchar(50) NOT NULL,
	description varchar(2000) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Table structure for table 'class_spells'
--

CREATE TABLE class_spells (
	spell_id int(11) NOT NULL,
	class_id int(11) NOT NULL,
	PRIMARY KEY (spell_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

	
ALTER TABLE spells ADD KEY (school_fid);

ALTER TABLE classes ADD KEY (primary_attribute_fid), ADD KEY (save_attribute_one_fid), ADD KEY (save_attribute_two_fid);

ALTER TABLE class_spells ADD KEY (spell_id), ADD KEY (class_id);
	
	
-- Constraint definitions

--
-- Constraints for table 'spells'
--

ALTER TABLE spells
	ADD CONSTRAINT spell_fk_1 FOREIGN KEY (school_fid) REFERENCES schools (id) ON DELETE SET NULL;

--
-- Constraints for table 'classes'
--

ALTER TABLE classes
	ADD CONSTRAINT class_fk_1 FOREIGN KEY (primary_attribute_fid) REFERENCES attributes (id),
	ADD CONSTRAINT class_fk_2 FOREIGN KEY (save_attribute_one_fid) REFERENCES attributes (id),
	ADD CONSTRAINT class_fk_3 FOREIGN KEY (save_attribute_two_fid) REFERENCES attributes (id);

--
-- Constraints for table 'class_spells'
--

ALTER TABLE class_spells
	ADD CONSTRAINT class_spell_fk_1 FOREIGN KEY (spell_id) REFERENCES spells (id),
	ADD CONSTRAINT class_spell_fk_2 FOREIGN KEY (class_id) REFERENCES classes (id);



-- Data dumps

--
-- Data dump for table 'schools'
--

INSERT INTO schools (name, description) VALUES
	('Abjuration', 'Abjuration spells are protective in nature, though some of them have aggressive uses. They create magical barriers, negate harmful effects, harm trespassers, or banish creatures to other planes of existence.'),
	('Conjuration', 'Conjuration spells involve the transportation of objects and creatures from one location to another. Some spells summon creatures or objects to the caster’s side, whereas others allow the caster to teleport to another location. Some conjurations create objects or effects out of nothing.'),
	('Divination', 'Divination spells reveal information, whether in the form of secrets long forgotten, glimpses of the future, the locations of hidden things, the truth behind illusions, or visions of distant people or places.'),
	('Enchantment', 'Enchantment spells affect the minds of others, influencing or controlling their behavior. Such spells can make enemies see the caster as a friend, force creatures to take a course of action, or even control another creature like a puppet.'),
	('Evocation', 'Evocation spells manipulate magical energy to produce a desired effect. Some call up blasts of fire or lightning. Others channel positive energy to heal wounds.'),
	('Illusion', 'Illusion spells deceive the senses or minds of others. They cause people to see things that are not there, to miss things that are there, to hear phantom noises, or to remember things that never happened. Some illusions create phantom images that any creature can see, but the most insidious illusions plant an image directly in the mind of a creature.'),
	('Necromancy', 'Necromancy spells manipulate the energies of life and death. Such spells can grant an extra reserve of life force, drain the life energy from another creature, create the undead, or even bring the dead back to life.'),
	('Transmutation', 'Transmutation spells change the properties of a creature, object, or environment. They might turn an enemy into a harmless creature, bolster the strength of an ally, make an object move at the caster’s command, or enhance a creature’s innate healing abilities to rapidly recover from injury.');


--
-- Data dump for table 'spells'
--

INSERT INTO spells (userid, name, school_fid) VALUES
	(0, 'Acid Splash', 2),
	(0, 'Druidcraft', 8),
	(0, 'Eldritch Blast', 5),
	(0, 'Guidance', 3),
	(0, 'Mage Hand', 2);

	
--
-- Data dump for table 'attributes'
--

INSERT INTO attributes (name, description) VALUES
	('Strength', 'Strength measures bodily power, athletic training, and the extent to which you can exert raw physical force.'),
	('Dexterity', 'Dexterity measures agility, reflexes, and balance.'),
	('Constitution', 'Constitution measures health, stamina, and vital force.'),
	('Intelligence', 'Intelligence measures mental acuity, accuracy of recall, and the ability to reason.'),
	('Wisdom', 'Wisdom reflects how attuned you are to the world around you and represents perceptiveness and intuition.'),
	('Charisma', 'Charisma measures your ability to interact effectively with others. It includes such factors as confidence and eloquence, and it can represent a charming or commanding personality.');

	
--
-- Data dump for table 'classes'
--

INSERT INTO classes (name, primary_attribute_fid, save_attribute_one_fid, save_attribute_two_fid) VALUES
	('Barbarian', 1, 1, 3),
	('Bard', 6, 2, 6),
	('Cleric', 5, 5, 6),
	('Druid', 5, 4, 5),
	('Fighter', 1, 1, 3),
	('Monk', 2, 1, 2),
	('Paladin', 6, 5, 6),
	('Ranger', 5, 1, 2),
	('Rogue', 2, 2, 4),
	('Sorcerer', 6, 3, 6),
	('Warlock', 6, 5, 6),
	('Wizard', 4, 4, 5);
	
	
--
-- Data dump for table 'class_spells'
--
	
INSERT INTO class_spells (spell_id, class_id) VALUES
	(1, 10), (1, 12),
	(2, 4),
	(3, 11),
	(4, 3), (4, 4),
	(5, 2), (5, 10), (5, 11), (5, 12);
