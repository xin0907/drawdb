import { Button, Input, Spin, Toast } from "@douyinfe/semi-ui";
import { useCallback, useContext, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Octokit } from "octokit";
import { IdContext } from "../../Workspace";
import { IconLink } from "@douyinfe/semi-icons";
import {
  useAreas,
  useDiagram,
  useEnums,
  useNotes,
  useTypes,
} from "../../../hooks";
import { databases } from "../../../data/databases";

export default function Share({ title }) {
  const { t } = useTranslation();
  const { gistId, setGistId } = useContext(IdContext);
  const [loading, setLoading] = useState(true);
  const { tables, relationships, database } = useDiagram();
  const { notes } = useNotes();
  const { areas } = useAreas();
  const { types } = useTypes();
  const { enums } = useEnums();

  const userToken = localStorage.getItem("github_token");
  const octokit = useMemo(() => {
    return new Octokit({
      auth: userToken ?? import.meta.env.VITE_GITHUB_ACCESS_TOKEN,
    });
  }, [userToken]);
  const url = useMemo(
    () => window.location.href + "?shareId=" + gistId,
    [gistId],
  );

  const diagramToString = useCallback(() => {
    return JSON.stringify({
      tables: tables,
      relationships: relationships,
      notes: notes,
      subjectAreas: areas,
      database: database,
      ...(databases[database].hasTypes && { types: types }),
      ...(databases[database].hasEnums && { enums: enums }),
      title: title,
    });
  }, [areas, notes, tables, relationships, database, title, enums, types]);

  const updateGist = useCallback(async () => {
    setLoading(true);
    try {
      await octokit.request(`PATCH /gists/${gistId}`, {
        gist_id: gistId,
        description: "drawDB diagram",
        files: {
          "share.json": {
            content: diagramToString(),
          },
        },
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [gistId, octokit, diagramToString]);

  const generateLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await octokit.request("POST /gists", {
        description: "drawDB diagram",
        public: false,
        files: {
          "share.json": {
            content: diagramToString(),
          },
        },
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      setGistId(res.data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [octokit, setGistId, diagramToString]);

  useEffect(() => {
    const updateOrGenerateLink = async () => {
      try {
        if (!gistId || gistId === "") {
          await generateLink();
        } else {
          await updateGist();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    updateOrGenerateLink();
  }, [gistId, generateLink, updateGist]);

  const copyLink = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        Toast.success(t("copied_to_clipboard"));
      })
      .catch(() => {
        Toast.error(t("oops_smth_went_wrong"));
      });
  };

  if (loading)
    return (
      <div className="text-blue-500 text-center">
        <Spin size="middle" />
        <div>{t("loading")}</div>
      </div>
    );

  return (
    <div>
      <div className="flex gap-3">
        <Input value={url} size="large" />
        <Button
          size="large"
          theme="solid"
          icon={<IconLink />}
          onClick={copyLink}
        >
          {t("copy_link")}
        </Button>
      </div>
      <hr className="opacity-20 mt-3 mb-1" />
      <div className="text-xs">
        * Sharing this link will not create a live real-time collaboration
        session
      </div>
    </div>
  );
}
