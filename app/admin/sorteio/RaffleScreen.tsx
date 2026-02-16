"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Users, Ticket, MapPin, Play, Loader2, Sparkles, Trophy, PartyPopper } from "lucide-react";
import { realizarSorteioAction } from "./actions";
import { cn } from "@/lib/utils";
import fiatMobiImg from "@/img/fiat-mobi.png";

// Mock Data for Units
const UNITS = [
    { name: "Filial Santarém", id: 1 },
    { name: "Filial Curuá", id: 2 },
    { name: "Filial Alenquer", id: 3 },
    { name: "Filial Óbidos", id: 4 },
    { name: "Filial Almeirim", id: 5 },
    { name: "Filial Santa Maria", id: 6 },
    { name: "Filial Ciabeer", id: 7 },
    { name: "Filial Uruará", id: 8 },
];

// Confetti Component
const Confetti = () => {
    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)],
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {confettiPieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute w-2 h-2 animate-confetti"
                    style={{
                        left: piece.left,
                        top: '-10px',
                        backgroundColor: piece.backgroundColor,
                        animationDelay: piece.animationDelay,
                    }}
                />
            ))}
        </div>
    );
};

interface RaffleScreenProps {
    totalCuponsElegiveis: number | null;
}

export function RaffleScreen({ totalCuponsElegiveis }: RaffleScreenProps) {
    const [status, setStatus] = useState<"idle" | "counting" | "finished">("idle");
    const [countdown, setCountdown] = useState(10);
    const [winner, setWinner] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (status === "counting" && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (status === "counting" && countdown === 0) {
            handleFinishRaffle();
        }
        return () => clearTimeout(timer);
    }, [status, countdown]);

    const handleStartRaffle = () => {
        setStatus("counting");
        setCountdown(10);
        setError(null);
        setWinner(null);
        setShowConfetti(false);
    };

    const handleFinishRaffle = async () => {
        try {
            const result = await realizarSorteioAction(1);

            if (result.success && result.cuponsSorteados && result.cuponsSorteados.length > 0) {
                setWinner(result.cuponsSorteados[0]);
                setStatus("finished");
                setShowConfetti(true);
                // Stop confetti after 5 seconds
                setTimeout(() => setShowConfetti(false), 5000);
            } else {
                throw new Error(result.message || "Erro ao sortear.");
            }
        } catch (err: any) {
            setError(err.message || "Erro desconhecido.");
            setStatus("idle");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-8 font-sans relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            {/* Confetti Effect */}
            {showConfetti && <Confetti />}

            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a8a] via-purple-600 to-red-600 tracking-tight uppercase">
                            Grande Sorteio Anual
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Campanha Meio a Meio 2026</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                            Sessão Ativa
                        </span>
                        <span className="text-sm font-bold text-[#1e3a8a]">
                            Administrador Principal
                        </span>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">👤</span>
                    </div>
                </div>
            </div>

            {/* Main Hero Card */}
            <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden mb-8 relative z-10">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-red-500/5 pointer-events-none"></div>

                <CardContent className="p-12 relative z-10 flex flex-col md:flex-row items-center justify-between min-h-[500px]">

                    {/* Left Content */}
                    <div className="md:w-1/2 space-y-8">
                        <Badge variant="secondary" className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 mb-4 rounded-full font-bold tracking-wide shadow-lg hover:shadow-xl transition-shadow">
                            <Sparkles className="w-4 h-4 inline mr-2" />
                            DESTAQUE PREMIUM
                        </Badge>

                        <div>
                            <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a8a] to-blue-600 leading-tight mb-2">
                                Prêmio Principal:
                            </h2>
                            <h3 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ef4444] to-red-600 leading-tight mb-4">
                                Fiat Mobi 0km
                            </h3>
                            <p className="text-xl text-gray-600 max-w-md leading-relaxed">
                                O carro mais amado do Brasil pode ser seu.
                                Sistema pronto para iniciar a rodada final.
                            </p>
                        </div>

                        {/* Status / Countdown Display */}
                        <div className="flex items-center gap-6 mt-12 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                {/* Animated Ring */}
                                <div className={cn(
                                    "absolute inset-0 border-4 rounded-full",
                                    status === 'counting'
                                        ? "border-red-500 animate-ping"
                                        : "border-red-200"
                                )}></div>
                                <div className={cn(
                                    "absolute inset-0 border-4 rounded-full",
                                    status === 'counting'
                                        ? "border-red-400"
                                        : "border-red-300"
                                )}></div>
                                {status === 'counting' ? (
                                    <span className="text-4xl font-black text-red-600 animate-pulse">{countdown}</span>
                                ) : (
                                    <Award className="w-12 h-12 text-red-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                                    STATUS DO SORTEIO
                                </p>
                                <p className="text-2xl font-black text-gray-700">
                                    {status === 'idle' && "AGUARDANDO INÍCIO"}
                                    {status === 'counting' && (
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
                                            ESCANEANDO DADOS...
                                        </span>
                                    )}
                                    {status === 'finished' && (
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                                            VENCEDOR ENCONTRADO!
                                        </span>
                                    )}
                                </p>

                            </div>
                        </div>
                    </div>

                    {/* Right Content - Car Image */}
                    <div className="md:w-1/2 relative h-full flex justify-center items-center">
                        {/* Background Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-purple-500/20 to-blue-500/20 rounded-full opacity-50 blur-3xl transform scale-110 animate-pulse"></div>

                        {/* Car Image Container */}
                        <div className="relative z-10 w-full max-w-lg aspect-video rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group">
                            <Image
                                src={fiatMobiImg}
                                alt="Fiat Mobi 0km"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />

                            {/* Overlay Badge */}
                            <div className="absolute bottom-6 left-6 bg-gradient-to-r from-[#ef4444] to-red-600 text-white px-6 py-3 font-black text-lg rounded-xl shadow-2xl">
                                FIAT MOBI 2026
                            </div>

                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Control Bar */}
            <div className="flex justify-center mb-8 relative z-10">
                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm w-full max-w-2xl">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-6">
                            <div className="text-center">
                                <h3 className="text-2xl font-black text-gray-800 mb-2">Pronto para Sortear?</h3>
                                <p className="text-gray-500">Clique no botão abaixo para iniciar a contagem regressiva de 10 segundos</p>
                            </div>
                            <Button
                                size="lg"
                                className={cn(
                                    "w-full max-w-md h-16 text-2xl font-black rounded-2xl transition-all duration-300 shadow-2xl",
                                    status === 'idle'
                                        ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:scale-105 hover:shadow-red-500/50"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                )}
                                onClick={handleStartRaffle}
                                disabled={status !== 'idle' || !totalCuponsElegiveis}
                            >
                                {status === 'idle' ? (
                                    <>
                                        <Play className="w-7 h-7 mr-3" />
                                        INICIAR CONTAGEM
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="w-7 h-7 mr-3 animate-spin" />
                                        PROCESSANDO...
                                    </>
                                )}
                            </Button>
                            {error && (
                                <div className="w-full p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                                    <p className="text-red-600 font-semibold text-center">{error}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Full Screen Countdown Overlay */}
            {status === 'counting' && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative flex items-center justify-center">
                        {/* Pulse Effect Rings */}
                        <div className="absolute w-96 h-96 border-4 border-red-500/30 rounded-full animate-ping delay-75"></div>
                        <div className="absolute w-80 h-80 border-4 border-red-500/50 rounded-full animate-ping delay-150"></div>
                        <div className="absolute w-64 h-64 border-4 border-red-500/70 rounded-full animate-ping"></div>

                        {/* Countdown Number */}
                        <span className="text-[12rem] font-black text-white drop-shadow-[0_0_50px_rgba(239,68,68,0.8)] tabular-nums animate-pulse">
                            {countdown}
                        </span>
                    </div>
                    <div className="mt-12 text-center">
                        <h2 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest animate-bounce">Sorteando...</h2>
                        <p className="text-gray-400 text-lg">Preparando para revelar o grande vencedor</p>
                    </div>
                </div>
            )}

            {/* Winner Reveal Modal */}
            {status === 'finished' && winner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-3xl overflow-hidden max-w-6xl w-full shadow-2xl animate-in zoom-in-95 duration-700 slide-in-from-bottom-10 relative border border-white/20">

                        {/* Decorative Elements */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

                        <div className="flex flex-col md:flex-row relative z-10 min-h-[600px]">
                            {/* Left Side - Car Image (Large & Prominent) */}
                            <div className="md:w-1/2 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-8 relative overflow-hidden">
                                {/* Spotlight Effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-transparent to-blue-500/20"></div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50"></div>

                                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                                    <div className="relative w-full aspect-[4/3] group perspective-1000">
                                        <Image
                                            src={fiatMobiImg}
                                            alt="Prize Car - Fiat Mobi"
                                            fill
                                            className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-105"
                                        />
                                    </div>
                                    <h3 className="text-4xl font-black text-white mt-8 tracking-wider uppercase text-center drop-shadow-lg">
                                        Fiat Mobi <span className="text-red-500">0km</span>
                                    </h3>
                                    <div className="mt-4 px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                        <span className="text-white/80 font-semibold tracking-widest text-sm uppercase">Prêmio Oficial</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Winner Details */}
                            <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center text-left relative bg-white/50 backdrop-blur-sm">
                                <div className="mb-10">
                                    {/* Winner Badge */}
                                    <div className="flex items-center gap-3 mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-3 rounded-full w-fit shadow-xl transform -rotate-2 hover:rotate-0 transition-transform">
                                        <Trophy className="w-8 h-8 drop-shadow-md" />
                                        <span className="text-base font-black tracking-[0.2em] uppercase">
                                            GRANDE VENCEDOR
                                        </span>
                                    </div>

                                    {/* Winner Name */}
                                    <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a8a] via-purple-600 to-red-600 leading-[0.9] mb-4 tracking-tight animate-in slide-in-from-left duration-700 drop-shadow-sm break-words">
                                        {winner.razao_social || winner.nome_cliente || "Cliente Anônimo"}
                                    </h2>

                                    {/* Contact Info */}
                                    {winner.whatsapp && (
                                        <div className="flex items-center gap-2 mb-6 text-2xl font-bold text-green-600 animate-pulse">
                                            <span className="bg-green-100 px-4 py-1 rounded-full border-2 border-green-200">
                                                WhatsApp: {winner.whatsapp}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 mb-4">
                                        {/* Coupon Info */}
                                        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm w-fit">
                                            <Ticket className="w-8 h-8 text-red-500" />
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cupom Sorteado</p>
                                                <p className="text-2xl font-black text-gray-800">#{winner.id}</p>
                                            </div>
                                        </div>

                                        {/* Branch Info */}
                                        {winner.cod_filial && (
                                            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm w-fit">
                                                <MapPin className="w-8 h-8 text-blue-500" />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cód. Filial</p>
                                                    <p className="text-2xl font-black text-gray-800">{winner.cod_filial}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-lg text-gray-600 font-medium">
                                        Nota Fiscal: <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{winner.num_nota}</span>
                                    </p>
                                </div>

                                {/* Prize Details Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-green-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg text-white shrink-0">
                                                <span className="font-black text-lg">$</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-green-600 uppercase leading-tight">Valor</p>
                                                <p className="font-black text-lg text-green-900 leading-tight">R$ 79.990</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl shadow-sm border border-purple-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg text-white shrink-0">
                                                <Award className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-purple-600 uppercase leading-tight">Status</p>
                                                <p className="font-black text-lg text-purple-900 leading-tight">Validado</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2 bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-2xl shadow-md text-white flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase opacity-80 leading-tight">Modelo Oficial</p>
                                            <p className="font-black text-xl leading-tight">Fiat Mobi Like <span className="text-yellow-300">2026</span></p>
                                        </div>
                                        <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                                            <span className="font-black text-sm tracking-wider">0KM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 mt-auto">
                                    <Button
                                        className="flex-1 bg-[#1e3a8a] hover:bg-blue-900 text-white font-black h-16 rounded-xl text-xl shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
                                        onClick={() => {
                                            setStatus('idle');
                                            setShowConfetti(false);
                                        }}
                                    >
                                        <Trophy className="w-6 h-6 mr-3" />
                                        Confirmar Entrega
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-none w-16 h-16 rounded-xl border-2 border-gray-200 hover:border-gray-300 text-[#1e3a8a] bg-white hover:bg-gray-50 flex items-center justify-center"
                                    >
                                        <Sparkles className="w-6 h-6" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Units */}
            <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl relative z-10">
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a8a] to-purple-600 mb-6 flex items-center">
                    <MapPin className="w-6 h-6 mr-3 text-red-500" />
                    UNIDADES PARTICIPANTES
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {UNITS.map(unit => (
                        <div key={unit.id} className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 border-transparent hover:border-blue-200">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
                                <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-xs font-bold text-gray-700 text-center leading-tight">
                                {unit.name.split(' ').map((line, i) => (
                                    <span key={i} className="block">{line}</span>
                                ))}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
