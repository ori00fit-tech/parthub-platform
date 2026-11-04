-- Morocco layer, part 2/3: OEM / aftermarket / used. Needed by catalog search.
ALTER TABLE parts ADD COLUMN part_origin TEXT DEFAULT 'aftermarket';
