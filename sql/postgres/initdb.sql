--CREATE USER user_name WITH ENCRYPTED PASSWORD 'password';

--CREATE DATABASE db_name WITH OWNER user_name; 



CREATE TABLE IF NOT EXISTS user_transaction_status (
    id INT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    message VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_info (
    keycloak_id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS transaction_data (
    id BIGSERIAL PRIMARY KEY,
    original_name VARCHAR(200) NOT NULL,
    file_name VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_transaction (
    id BIGSERIAL PRIMARY KEY,
    execution_date TIMESTAMPTZ NOT NULL,
    user_id uuid NOT NULL,
    transaction_data_id INT8 NOT NULL,
    user_transaction_status_id INT NOT NULL,
    FOREIGN KEY (user_transaction_status_id)
      REFERENCES user_transaction_status (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (user_id)
      REFERENCES user_info (keycloak_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (transaction_data_id)
      REFERENCES transaction_data (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS user_transaction_email (
    id BIGSERIAL PRIMARY KEY,
    user_transaction_id INT8 NOT NULL,
    to_email VARCHAR(200) NOT NULL,
    from_email VARCHAR(200) NOT NULL,
    subject VARCHAR(500),
    body VARCHAR(5000),
    FOREIGN KEY (user_transaction_id)
      REFERENCES user_transaction (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO user_transaction_status VALUES
    (1, 'STORE_SUC', 'Transaction stored successfully'),
    (2, 'STORE_ERR', 'Transaction storing error'),
    (3, 'SENT_SUC', 'Transaction sent to destination'),
    (4, 'SENT_ERR', 'Transaction sending error');

-- DROP TABLE user_transaction_email, user_transaction_status, user_transaction, transaction_data, user_info;