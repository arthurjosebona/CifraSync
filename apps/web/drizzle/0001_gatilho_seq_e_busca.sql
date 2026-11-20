-- Toda atualização de uma tabela sincronizada recebe um novo valor do cursor global (sync_seq).
-- A inserção já usa o DEFAULT nextval('sync_seq').
CREATE OR REPLACE FUNCTION cifrasync_bump_seq() RETURNS trigger AS $$
BEGIN
  NEW.seq := nextval('sync_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER songs_bump_seq BEFORE UPDATE ON "songs" FOR EACH ROW EXECUTE FUNCTION cifrasync_bump_seq();
--> statement-breakpoint
CREATE TRIGGER setlists_bump_seq BEFORE UPDATE ON "setlists" FOR EACH ROW EXECUTE FUNCTION cifrasync_bump_seq();
--> statement-breakpoint
CREATE TRIGGER setlist_items_bump_seq BEFORE UPDATE ON "setlist_items" FOR EACH ROW EXECUTE FUNCTION cifrasync_bump_seq();
--> statement-breakpoint
CREATE TRIGGER groups_bump_seq BEFORE UPDATE ON "groups" FOR EACH ROW EXECUTE FUNCTION cifrasync_bump_seq();
--> statement-breakpoint
CREATE TRIGGER group_members_bump_seq BEFORE UPDATE ON "group_members" FOR EACH ROW EXECUTE FUNCTION cifrasync_bump_seq();
--> statement-breakpoint
CREATE TRIGGER group_setlists_bump_seq BEFORE UPDATE ON "group_setlists" FOR EACH ROW EXECUTE FUNCTION cifrasync_bump_seq();
--> statement-breakpoint
CREATE TRIGGER user_settings_bump_seq BEFORE UPDATE ON "user_settings" FOR EACH ROW EXECUTE FUNCTION cifrasync_bump_seq();
--> statement-breakpoint
-- Busca de usuários por prefixo do nome de usuário (convites de grupo).
CREATE INDEX IF NOT EXISTS "user_username_prefix_idx" ON "user" ("username" text_pattern_ops);
