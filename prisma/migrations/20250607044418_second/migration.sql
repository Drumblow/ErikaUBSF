-- CreateTable
CREATE TABLE "cronogramas" (
    "id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "nomeUBSF" TEXT,
    "enfermeiro" TEXT,
    "medico" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cronogramas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" TEXT NOT NULL,
    "cronogramaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "diaSemana" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atividades_cronogramaId_data_diaSemana_descricao_key" ON "atividades"("cronogramaId", "data", "diaSemana", "descricao");

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_cronogramaId_fkey" FOREIGN KEY ("cronogramaId") REFERENCES "cronogramas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
