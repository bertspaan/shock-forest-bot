CREATE TABLE public.messages (
	id int NOT NULL,
	chat_id bigint NOT NULL,
  user_id int NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  text text,
  data jsonb,
	CONSTRAINT messages_pk PRIMARY KEY (id)
);

-- TODO: add replies!
-- TODO: create indexes!!!!

CREATE TABLE public.hashtags (
  hashtag text,
  message_id int REFERENCES public.messages(id) ON DELETE CASCADE
);

-- TODO: create indexes!!!!

CREATE TABLE public.files (
  id text NOT NULL,
  message_id int REFERENCES public.messages(id) ON DELETE CASCADE,
  data jsonb,
  path text,
  CONSTRAINT files_pk PRIMARY KEY (id)
);

-- TODO: create indexes!!!!