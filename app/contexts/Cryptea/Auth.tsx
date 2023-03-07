import { createContext, useContext, useEffect, useState } from "react";
import { AxiosError } from 'axios';
import { LinkConnector, UDConnector } from "./connectors";
import mimg from "../../../public/images/mglink.svg";
import unstop from "../../../public/images/unstoppable.svg";
import { webSocketProvider, chains, provider } from './connectors/chains';
import * as ethers from "ethers";
import {
  AuthAddressType,
  AuthContext,
  authData,
  authenticateUserDefault,
  authenticateUserExtended,
  configType,
  userData,
} from "./types";
import './DB';
import { post_request } from "./requests";
import { createClient, useAccount, WagmiConfig } from "wagmi";
import { useRouter } from "next/router";
import Loader from "../../components/elements/loader";
import {
  RainbowKitProvider,
  connectorsForWallets,
  getDefaultWallets,
  getWalletConnectConnector,
  lightTheme
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  rainbowWallet,
  injectedWallet,
  braveWallet,
  coinbaseWallet,
  ledgerWallet,
  trustWallet,
  argentWallet
} from "@rainbow-me/rainbowkit/wallets";

import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { InjectedConnector } from "wagmi/connectors/injected";


let user:userData | undefined;

let message = 'Welcome to Cryptea';

let isAuth = false;


export const AuthAddress = async ({address, signature, message }: AuthAddressType) => {

  try {
    
      const userx = await post_request(`/login/walletAuth`, {
        address,
        signature,
        message,
        tz: window.jstz.determine().name(),
      });

      
      if(!userx.data.error){

        const { email, img, accounts, username, id, email_verified_at }: { username: string, img: string,email : string, accounts: string[], id: number|string, email_verified_at: any } = userx.data.data;

         user = {
           id,
           email,
           username,
           accounts,
           img,
           email_verified_at,
         };

         localStorage.setItem('user', JSON.stringify(user));

         localStorage.setItem("userToken", userx.data.token);

         isAuth = true;

      }else{
          throw "Invalid Login Details";
      }
      
  }catch (err) {
      const error = err as AxiosError;
      // console.log(err);
      if (error.response) {
        throw "Invalid Login Details";
      }
    }
  return user;
};

let config: undefined | configType;

export const AuthUser = async ({
  signMessage,
  isConnected,
  address,
  signMessageAsync,
  isSuccess,
  connectAsync,
  mainx,
}: authenticateUserExtended): Promise<userData | undefined> => {
  if (signMessage !== undefined) message = signMessage;

  // if (!isConnected) {
  //   config = await connectAsync({ connector: type });
  // }

  if (!mainx && typeof address == 'string') {

    const data = await signMessageAsync({ message });

    if (data.length) {

      try {
        const main = await AuthAddress({
          signature: data,
          message,
          address: address as string,
        });

        return main;

      } catch (err) {
        console.log(err);
        throw "Something went wrong, please try again";
      }
    } else {
      
        console.log(data)

        throw "Something went wrong, please try again";
    }
  }
};

export const AuthContextMain = createContext<AuthContext>({});

export const CrypteaProvider = ({children}: {children: JSX.Element}) => {
  const [isAuthenticated, setAuth] = useState<boolean | undefined>();

  const [context, setContext] = useState<userData | undefined>(user);

  const [mobile, setMobile] = useState<boolean>(false);

  const [genLoader, setGenLoader] = useState<boolean>(true);

  const router = useRouter();

  useEffect(() => {
    if (
      localStorage.getItem("userToken") !== null &&
      router.pathname.indexOf("/settings") == -1 &&
      router.pathname.indexOf("/verify/email") == -1
    ) {
      "user".get("*").then((cacheUser: any) => {
        if (
          !Boolean(cacheUser?.email_verified_at) &&
          Boolean(cacheUser?.email)
        ) {
          router.push("/verify/email");

          setGenLoader(false);
          
        } else {
          setGenLoader(false);
        }
      });
    } else {
      setGenLoader(false);
    }

    setMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );

  }, [router])


  useEffect(() => {
    if (localStorage.getItem('userToken') !== null) {
        setAuth(true);
      }else{
       setAuth(false)
    }
  }, [])



  const mail = ({ chains }: { chains: any }) => ({
    id: "mail",
    name: "Email link",
    iconUrl: mimg.src,
    iconBackground: "#f57059",
    createConnector: () => {
      const connector = new LinkConnector({ chains, options: {} });

      const ee = new InjectedConnector({
        chains,
        options: {
          name: "Cryptea",
          shimDisconnect: true,
        },
      });

      return {
        connector,
      };
    },
  });

  const UD = ({ chains }: { chains: any }) => ({
    id: "unstoppable",
    name: "Login with unstoppable",
    iconUrl: unstop.src,
    iconBackground: "#0d67fe",
    createConnector: () => {
      const connector = new UDConnector({ chains, options: {} });
      return {
        connector,
      };
    },
  });
  
  

  const connectors = connectorsForWallets([
    {
      groupName: "Recommended",
      wallets:
        router.pathname == "/pay/[slug]"
          ? [
              metaMaskWallet({ chains }),
              walletConnectWallet({ chains }),
              coinbaseWallet({ chains, appName: "Cryptea" }),
            ]
          : [
              metaMaskWallet({ chains }),
              mail({ chains }),
              walletConnectWallet({ chains }),
              UD({ chains }),
              coinbaseWallet({ chains, appName: "Cryptea" }),
            ],
    },
    {
      groupName: "Other",
      wallets: [
        rainbowWallet({ chains }),
        trustWallet({ chains }),
        ledgerWallet({ chains }),
        injectedWallet({ chains }),
        argentWallet({ chains }),
        braveWallet({ chains }),
      ],
    },
  ]);

  const client = createClient({
    autoConnect: false,
    connectors,
    webSocketProvider,
    provider,
  });


  return (
      <WagmiConfig client={client}>
        
        <RainbowKitProvider coolMode theme={lightTheme({
            accentColor: "#f57059" 
        })} chains={chains}>
        <AuthContextMain.Provider
          value={{
            mobile,
            user: context,
            isAuthenticated,
            update: (e: userData | undefined) => setContext(e),
          }}
        >
          {genLoader ? <Loader head={false}/> : children}
        </AuthContextMain.Provider>
        </RainbowKitProvider>
      </WagmiConfig>
  );
}

