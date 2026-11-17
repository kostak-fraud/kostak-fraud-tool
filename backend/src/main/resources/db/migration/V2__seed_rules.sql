INSERT INTO rules(id, tenant_id, name, description, channel, field_name, operator, expected_value, score_contribution, active, version, created_at, updated_at)
VALUES
('10000000-0000-0000-0000-000000000001','demo-tenant','High-risk merchant','High risk merchant transactions require review','POS','merchantRisk','EQ','HIGH',35,TRUE,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('10000000-0000-0000-0000-000000000002','demo-tenant','Non-3DS payment','Non-3DS POS payment signal','POS','threeDs','EQ','false',30,TRUE,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('10000000-0000-0000-0000-000000000003','demo-tenant','Large wallet transfer','Large electronic money transfer','WALLET','amount','GTE','15000',70,TRUE,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('10000000-0000-0000-0000-000000000004','demo-tenant','Large terminal payment','Large physical terminal payment','PHYSICAL_POS','amount','GTE','20000',65,TRUE,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
