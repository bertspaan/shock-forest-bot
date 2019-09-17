CREATE TABLE public.messages (
  chat_id bigint NOT NULL,
	message_id int NOT NULL,
  date_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  date_edited TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE,
  reply_to int,
  user_id int NOT NULL,
  text text,
  data jsonb,
  PRIMARY KEY (chat_id, message_id)
);

-- TODO: create indexes!!!!
--   - id
--   - date_edited
--   - reply_to

CREATE TABLE public.hashtags (
  chat_id bigint NOT NULL,
  message_id int NOT NULL,
  hashtag text,
  PRIMARY KEY (hashtag, chat_id, message_id),
  FOREIGN KEY (chat_id, message_id) REFERENCES public.messages(chat_id, message_id) ON DELETE CASCADE
);

-- TODO: create indexes!!!!

CREATE TABLE public.files (
  file_id text NOT NULL,
  chat_id bigint NOT NULL,
  message_id int NOT NULL,
  file_name text,
  file_size int,
  mime_type text,
  path text,
  PRIMARY KEY (file_id),
  FOREIGN KEY (chat_id, message_id) references public.messages(chat_id, message_id) ON DELETE CASCADE
);

-- TODO: create indexes!!!!

CREATE TABLE public.locations (
  message_id int NOT NULL,
  chat_id bigint NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  point geometry,
  PRIMARY KEY (chat_id, message_id, timestamp),
  FOREIGN KEY (chat_id, message_id) references public.messages(chat_id, message_id) ON DELETE CASCADE
);
