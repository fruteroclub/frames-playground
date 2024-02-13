import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
  getFrameMessage,
} from 'frames.js/next/server';
import Link from 'next/link';
import { DEBUG_HUB_OPTIONS } from './debug/constants';
import { getTokenUrl } from 'frames.js';

import {
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  TransactionExecutionError,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import PulpaTokenABI from './../contracts/PulpaTokenABI';
import React from 'react';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: sepolia,
  transport: http(),
});

const PULPA_TOKEN_SEPOLIA_ADDRESS =
  '0x029263aa1be88127f1794780d9eef453221c2f30';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY as Hex | undefined;

type State = {
  pageIndex: number;
};

const totalPages = 5;
const initialState: State = { pageIndex: 0 };

const reducer: FrameReducer<State> = (state, action) => {
  const buttonIndex = action.postBody?.untrustedData.buttonIndex;

  if (state.pageIndex === 0) {
    return { pageIndex: 1 };
  }
  if (state.pageIndex === 4 && buttonIndex === 1) {
    return { pageIndex: 0 };
  } else {
    return {
      pageIndex: buttonIndex
        ? (state.pageIndex +
            (buttonIndex === 2 ? 1 : buttonIndex === 1 ? -1 : 0)) %
          totalPages
        : state.pageIndex,
    };
  }
};

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);
  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  try {
    // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
    // example: load the users credentials & check they have an NFT

    // TODO: Check if user has liked and recasted

    // TODO: Check if user has an address connected

    // TODO: Mint PULPA tokens

    async function mintPulpa() {
      try {
        if (!MINTER_PRIVATE_KEY)
          throw new Error('MINTER_PRIVATE_KEY is not set');

        const { result, request } = await publicClient.simulateContract({
          address: PULPA_TOKEN_SEPOLIA_ADDRESS,
          abi: PulpaTokenABI,
          functionName: 'mint',
          args: ['0xF54f4815f62ccC360963329789d62d3497A121Ae', 1],
          account: privateKeyToAccount(MINTER_PRIVATE_KEY),
        });
        if (!request) {
          throw new Error('Could not simulate contract');
        }
        const hash = await walletClient.writeContract(request);
        console.log(hash);
      } catch (error) {
        if (
          error instanceof TransactionExecutionError &&
          error.details.startsWith('gas required exceeds allowance')
        ) {
          return (
            <div className="p-4">
              <FrameContainer
                postUrl="/frames"
                state={state}
                previousFrame={previousFrame}
              >
                <FrameImage>
                  <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
                    ¡Se acabó el gas!
                  </div>
                </FrameImage>
                <FrameButton
                  mint={getTokenUrl({
                    address: '0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df',
                    tokenId: '123',
                    chainId: 7777777,
                  })}
                >
                  Mint
                </FrameButton>
                <FrameButton href={`https://frutero.club`}>
                  Frutero Club
                </FrameButton>
              </FrameContainer>
            </div>
          );
        }
      }
    }

    console.log('info: state is:', state);

    const frameMessage = await getFrameMessage(previousFrame.postBody, {
      ...DEBUG_HUB_OPTIONS,
      fetchHubContext: true,
    });

    if (frameMessage && !frameMessage?.isValid) {
      throw new Error('Invalid frame payload');
    }

    if (frameMessage) {
      const {
        isValid,
        buttonIndex,
        inputText,
        castId,
        requesterFid,
        casterFollowsRequester,
        requesterFollowsCaster,
        likedCast,
        recastedCast,
        requesterVerifiedAddresses,
        requesterUserData,
      } = frameMessage;

      console.log('info: frameMessage is:', frameMessage);
    }

    const baseUrl = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';

    // then, when done, return next frame
    return (
      <div className="p-4">
        frames.js starter kit.{' '}
        <Link href={`/debug?url=${baseUrl}`} className="underline">
          Debug
        </Link>
        <FrameContainer
          postUrl="/frames"
          state={state}
          previousFrame={previousFrame}
        >
          <FrameImage>
            <div tw="flex flex-col h-full w-full bg-slate-700 text-white justify-center items-center relative">
              {state.pageIndex === 0 && page1}
              {state.pageIndex === 1 && page2}
              {state.pageIndex === 2 && page3}
              {state.pageIndex === 3 && page4}
              {state.pageIndex === 4 && page5}
              <div tw="flex w-full justify-center bottom-0 absolute">
                {state.pageIndex + 1} / {totalPages}
              </div>
            </div>
          </FrameImage>
          {state.pageIndex !== 0 ? (
            <FrameButton>
              {state.pageIndex !== 4 ? '←' : 'Reiniciar'}
            </FrameButton>
          ) : null}
          {state.pageIndex !== 4 ? (
            <FrameButton>{state.pageIndex === 0 ? 'Iniciar' : '→'}</FrameButton>
          ) : (
            <FrameButton onClick={mintPulpa}>Reclamar $PULPA</FrameButton>
          )}
          {state.pageIndex === 4 ? (
            <FrameButton href={`https://t.me/+77kyZqV51Dg0ZDgx`}>
              Canal Telegram
            </FrameButton>
          ) : null}
          {state.pageIndex === 4 ? (
            <FrameButton href={`https://frutero.club`}>
              Frutero Club
            </FrameButton>
          ) : null}
        </FrameContainer>
      </div>
    );
  } catch (error) {
    console.error(error);
    return (
      <div className="p-4">
        <FrameContainer
          postUrl="/frames"
          state={state}
          previousFrame={previousFrame}
        >
          {/* <FrameImage src="https://framesjs.org/og.png" /> */}
          <FrameImage>
            <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
              ¡Ups, ocurrió un error!
            </div>
          </FrameImage>
          <FrameButton
            mint={getTokenUrl({
              address: '0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df',
              tokenId: '123',
              chainId: 7777777,
            })}
          >
            Mint
          </FrameButton>
          <FrameButton href={`https://frutero.club`}>Frutero Club</FrameButton>
        </FrameContainer>
      </div>
    );
  }
}

const page1 = (
  <div tw="flex flex-col items-center text-center">
    <p>¿Quieres saber qué es Frutero Club?</p>
    <p>Completa este miniquest y gana $PULPA</p>
    <p>Haz click en "Iniciar" para conocer más</p>
  </div>
);

const page2 = (
  <div tw="flex flex-col items-center text-center">
    <p>
      Frutero Club nació cuando un grupo de apasionados por la tecnología
      empezaron a juntarse para construir soluciones "chidas"
    </p>
  </div>
);

const page3 = (
  <div tw="flex flex-col items-center text-center">
    <p>
      Lo que empezó como reuniones de nerds se convirtió en una comunidad
      internacional (de nerds)
    </p>
  </div>
);

const page4 = (
  <div tw="flex flex-col items-center text-center">
    <p>
      Ahora, ayudamos a otras personas a construir sus ideas para resolver
      problemas reales
    </p>
  </div>
);

const page5 = (
  <div tw="flex flex-col">
    <p>Si quieres saber más, únete a nuestro canal de Telegram</p>
    <p>Te has ganado 10 $PULPA, nuestro token comunitario</p>
  </div>
);
